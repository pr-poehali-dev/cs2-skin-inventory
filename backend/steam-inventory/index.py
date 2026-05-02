import os
import json
import urllib.request
import urllib.parse

STEAM_API_KEY = os.environ.get('STEAM_API_KEY', '')
CS2_APP_ID = 730


def resolve_steam_id(identifier: str) -> str | None:
    """Разрешает SteamID64 из ванити-URL или возвращает напрямую если уже числовой."""
    identifier = identifier.strip()
    if identifier.isdigit() and len(identifier) == 17:
        return identifier
    # Пробуем как vanity URL
    params = urllib.parse.urlencode({
        'key': STEAM_API_KEY,
        'vanityurl': identifier,
    })
    url = f'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?{params}'
    with urllib.request.urlopen(url, timeout=8) as r:
        data = json.loads(r.read())
    resp = data.get('response', {})
    if resp.get('success') == 1:
        return resp['steamid']
    return None


def get_player_summary(steam_id: str) -> dict:
    """Получает базовую информацию об игроке."""
    params = urllib.parse.urlencode({
        'key': STEAM_API_KEY,
        'steamids': steam_id,
    })
    url = f'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?{params}'
    with urllib.request.urlopen(url, timeout=8) as r:
        data = json.loads(r.read())
    players = data.get('response', {}).get('players', [])
    return players[0] if players else {}


def get_inventory(steam_id: str) -> list:
    """Загружает инвентарь CS2 игрока."""
    url = f'https://steamcommunity.com/inventory/{steam_id}/{CS2_APP_ID}/2?l=russian&count=500'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=12) as r:
        data = json.loads(r.read())

    assets = data.get('assets', [])
    descriptions = {
        f"{d['classid']}_{d['instanceid']}": d
        for d in data.get('descriptions', [])
    }

    items = []
    for asset in assets:
        key = f"{asset['classid']}_{asset['instanceid']}"
        desc = descriptions.get(key, {})
        if not desc:
            continue

        tags = desc.get('tags', [])
        rarity = next((t for t in tags if t.get('category') == 'Rarity'), {})
        item_type = next((t for t in tags if t.get('category') == 'Type'), {})
        wear_tag = next((t for t in tags if t.get('category') == 'Exterior'), {})
        weapon_tag = next((t for t in tags if t.get('category') == 'Weapon'), {})
        quality_tag = next((t for t in tags if t.get('category') == 'Quality'), {})

        # Извлекаем float из описания
        float_value = None
        pattern_id = None
        for d_item in desc.get('descriptions', []):
            val = d_item.get('value', '')
            if 'float' in val.lower() or 'Float Value' in val:
                try:
                    float_value = float(val.split(':')[-1].strip())
                except Exception:
                    pass
            if 'Paint Seed' in val or 'Pattern' in val:
                try:
                    pattern_id = int(val.split(':')[-1].strip())
                except Exception:
                    pass

        tradable = desc.get('tradable', 0) == 1
        marketable = desc.get('marketable', 0) == 1

        icon_url = desc.get('icon_url', '')
        image_url = f'https://community.cloudflare.steamstatic.com/economy/image/{icon_url}/256x256' if icon_url else ''

        items.append({
            'assetid': asset.get('assetid'),
            'name': desc.get('market_hash_name', desc.get('name', '')),
            'display_name': desc.get('name', ''),
            'image': image_url,
            'rarity': rarity.get('internal_name', '').replace('Rarity_', '').lower(),
            'rarity_label': rarity.get('localized_tag_name', ''),
            'rarity_color': rarity.get('color', ''),
            'type': item_type.get('localized_tag_name', ''),
            'weapon': weapon_tag.get('localized_tag_name', ''),
            'wear': wear_tag.get('localized_tag_name', ''),
            'wear_internal': wear_tag.get('internal_name', ''),
            'quality': quality_tag.get('localized_tag_name', ''),
            'float': float_value,
            'pattern': pattern_id,
            'tradable': tradable,
            'marketable': marketable,
            'stickers': [],
        })

    return items


def handler(event: dict, context) -> dict:
    """
    Загружает инвентарь CS2 через Steam API.
    GET /steam-inventory?steamid=XXXXXXXX или ?vanity=nickname
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

    if not STEAM_API_KEY:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'STEAM_API_KEY не настроен'}),
        }

    params = event.get('queryStringParameters') or {}
    steam_input = params.get('steamid') or params.get('vanity') or ''

    if not steam_input:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Укажи steamid или vanity параметр'}),
        }

    steam_id = resolve_steam_id(steam_input)
    if not steam_id:
        return {
            'statusCode': 404,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Steam профиль не найден'}),
        }

    player = get_player_summary(steam_id)
    inventory = get_inventory(steam_id)

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({
            'steam_id': steam_id,
            'player': {
                'name': player.get('personaname', ''),
                'avatar': player.get('avatarfull', ''),
                'profile_url': player.get('profileurl', ''),
                'visibility': player.get('communityvisibilitystate', 1),
            },
            'inventory': inventory,
            'total': len(inventory),
        }),
    }
