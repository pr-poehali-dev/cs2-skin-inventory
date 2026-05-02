import json
import time
import urllib.request
import urllib.parse
import concurrent.futures

# Курсы валют (обновляются раз в сутки в реальном проекте)
USD_TO_RUB = 90.0
CNY_TO_RUB = 12.5

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, */*',
    'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
}

# Кэш агрегированных прайс-листов (живёт в памяти между вызовами)
_price_cache: dict = {}
_cache_ts: float = 0
CACHE_TTL = 1800  # 30 минут


def fetch_json(url: str, timeout: int = 10) -> dict | list | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode('utf-8'))
    except Exception:
        return None


def load_price_lists() -> dict:
    """Загружает прайс-листы lis-skins и buff163 из csgotrader агрегатора."""
    global _price_cache, _cache_ts
    now = time.time()
    if _price_cache and (now - _cache_ts) < CACHE_TTL:
        return _price_cache

    def fetch_lis():
        return fetch_json('https://prices.csgotrader.app/latest/lisskins.json', timeout=15) or {}

    def fetch_buff():
        return fetch_json('https://prices.csgotrader.app/latest/buff163.json', timeout=15) or {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:
        fut_lis = ex.submit(fetch_lis)
        fut_buff = ex.submit(fetch_buff)
        lis_data = fut_lis.result()
        buff_data = fut_buff.result()

    _price_cache = {'lisskins': lis_data, 'buff163': buff_data}
    _cache_ts = now
    return _price_cache


def parse_steam_price(price_str: str) -> float | None:
    """'4 547,90 руб.' → 4547.90"""
    if not price_str:
        return None
    cleaned = (price_str
               .replace('\u00a0', '').replace('\u202f', '').replace(' ', '')
               .replace('руб.', '').replace('$', '').replace('€', '').replace('₽', '')
               .replace(',', '.').strip())
    try:
        return round(float(cleaned), 2)
    except Exception:
        return None


def get_steam_price(market_hash_name: str) -> dict:
    """Steam Community Market — официальная цена в рублях (currency=5 = RUB)."""
    encoded = urllib.parse.quote(market_hash_name)
    url = f'https://steamcommunity.com/market/priceoverview/?appid=730&currency=5&market_hash_name={encoded}'
    data = fetch_json(url, timeout=8)

    if not data or not data.get('success'):
        return {'source': 'steam', 'name': 'Steam Market', 'price': None, 'currency': 'RUB',
                'url': f'https://steamcommunity.com/market/listings/730/{encoded}', 'error': 'no data'}

    lowest = parse_steam_price(data.get('lowest_price', ''))
    median = parse_steam_price(data.get('median_price', ''))
    volume_raw = data.get('volume', '0') or '0'
    try:
        volume = int(volume_raw.replace(',', '').replace('.', '').replace('\u00a0', '').strip())
    except Exception:
        volume = 0

    return {
        'source': 'steam',
        'name': 'Steam Market',
        'price': lowest,
        'median_price': median,
        'volume_24h': volume,
        'currency': 'RUB',
        'url': f'https://steamcommunity.com/market/listings/730/{encoded}',
        'error': None,
    }


def get_lisskins_price(market_hash_name: str, price_lists: dict) -> dict:
    """Lis-Skins — цена из агрегированного прайс-листа csgotrader (USD → RUB)."""
    lis_data = price_lists.get('lisskins', {})
    item = lis_data.get(market_hash_name)
    encoded = urllib.parse.quote(market_hash_name)

    if item and item.get('price') is not None:
        price_usd = float(item['price'])
        price_rub = round(price_usd * USD_TO_RUB, 2)
        return {
            'source': 'lisskins',
            'name': 'Lis-Skins',
            'price': price_rub,
            'price_usd': price_usd,
            'currency': 'RUB',
            'url': f'https://lis-skins.com/market/?game=cs2&search={encoded}',
            'error': None,
        }

    return {
        'source': 'lisskins',
        'name': 'Lis-Skins',
        'price': None,
        'currency': 'RUB',
        'url': f'https://lis-skins.com/market/?game=cs2',
        'error': 'not listed',
    }


def get_buff163_price(market_hash_name: str, price_lists: dict) -> dict:
    """Buff163 — цена из агрегированного прайс-листа csgotrader (USD → RUB)."""
    buff_data = price_lists.get('buff163', {})
    item = buff_data.get(market_hash_name)
    encoded = urllib.parse.quote(market_hash_name)

    if item:
        starting = item.get('starting_at', {}) or {}
        highest = item.get('highest_order', {}) or {}
        sell_price_usd = starting.get('price')
        buy_price_usd = highest.get('price')

        if sell_price_usd is not None:
            sell_rub = round(float(sell_price_usd) * USD_TO_RUB, 2)
            buy_rub = round(float(buy_price_usd) * USD_TO_RUB, 2) if buy_price_usd else None
            return {
                'source': 'buff163',
                'name': 'Buff163',
                'price': sell_rub,          # цена продавцов
                'buy_order': buy_rub,       # заявки покупателей
                'price_usd': float(sell_price_usd),
                'currency': 'RUB',
                'url': f'https://buff.163.com/market/goods?game=csgo&search={encoded}',
                'error': None,
            }

    return {
        'source': 'buff163',
        'name': 'Buff163',
        'price': None,
        'currency': 'RUB',
        'url': 'https://buff.163.com',
        'error': 'not listed',
    }


def get_exchange_rates() -> dict:
    """Получает актуальные курсы валют."""
    data = fetch_json('https://api.exchangerate-api.com/v4/latest/USD', timeout=5)
    if data and data.get('rates'):
        rates = data['rates']
        return {
            'usd_to_rub': rates.get('RUB', USD_TO_RUB),
            'cny_to_rub': rates.get('CNY', 12.5) and rates.get('RUB', USD_TO_RUB) / rates.get('CNY', 7.2),
        }
    return {'usd_to_rub': USD_TO_RUB, 'cny_to_rub': CNY_TO_RUB}


def handler(event: dict, context) -> dict:
    """
    Агрегирует цены с Steam Market, Lis-Skins и Buff163 по названию CS2 скина.
    GET /?name=AK-47%20%7C%20Asiimov%20%28Field-Tested%29
    GET /?names=item1,item2,item3   — батч до 5 скинов
    """
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    params = event.get('queryStringParameters') or {}
    name = params.get('name', '').strip()
    names_raw = params.get('names', '').strip()

    if not name and not names_raw:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажи name или names параметр'}),
        }

    items = [n.strip() for n in names_raw.split(',') if n.strip()][:5] if names_raw else [name]

    # Загружаем прайс-листы (кэшируются)
    price_lists = load_price_lists()

    results = {}
    for item_name in items:
        start = time.time()

        # Steam запрашиваем параллельно (он медленнее всех)
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
            fut_steam = ex.submit(get_steam_price, item_name)
            lis = get_lisskins_price(item_name, price_lists)
            buff = get_buff163_price(item_name, price_lists)
            steam = fut_steam.result()

        sources = [steam, lis, buff]
        available = [s for s in sources if s.get('price') is not None]
        prices = [s['price'] for s in available]

        min_p = min(prices) if prices else None
        max_p = max(prices) if prices else None
        spread = round((max_p - min_p) / min_p * 100, 1) if (min_p and max_p and min_p > 0) else None

        # Лучшая цена для продажи (максимальная среди площадок)
        best_sell = max(available, key=lambda s: s['price']) if available else None

        results[item_name] = {
            'name': item_name,
            'sources': sources,
            'min_price': min_p,
            'max_price': max_p,
            'spread_pct': spread,
            'best_sell': best_sell,
            'available_sources': len(available),
            'fetched_in_ms': round((time.time() - start) * 1000),
        }

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'results': results,
            'count': len(results),
            'price_list_cached': bool(_price_cache),
            'timestamp': int(time.time()),
        }),
    }
