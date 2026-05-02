import { useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';

const STEAM_API_URL = 'https://functions.poehali.dev/772ff4ab-4485-4a30-89b3-d3c3f92c17fc';

interface SteamPlayer {
  name: string;
  avatar: string;
  profile_url: string;
  visibility: number;
}

interface SteamItem {
  assetid: string;
  name: string;
  display_name: string;
  image: string;
  rarity: string;
  rarity_label: string;
  rarity_color: string;
  type: string;
  weapon: string;
  wear: string;
  float: number | null;
  pattern: number | null;
  tradable: boolean;
  marketable: boolean;
}

interface SteamData {
  steam_id: string;
  player: SteamPlayer;
  inventory: SteamItem[];
  total: number;
}

const AK47_IMG = "https://cdn.poehali.dev/projects/5e720fad-2d00-4eef-a6b5-d6f208c2f8ac/files/d1c23fa1-abc8-46b9-962d-b9d518faf425.jpg";
const AWP_IMG = "https://cdn.poehali.dev/projects/5e720fad-2d00-4eef-a6b5-d6f208c2f8ac/files/4aa23be4-85f0-4070-8418-c54dad6437db.jpg";
const M4A4_IMG = "https://cdn.poehali.dev/projects/5e720fad-2d00-4eef-a6b5-d6f208c2f8ac/files/b18ca758-1459-4661-a57c-e44c87242cc6.jpg";

type Tab = 'profile' | 'inventory' | 'catalog' | 'analytics' | 'search' | 'friends';

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Профиль', icon: 'User' },
  { id: 'inventory', label: 'Инвентарь', icon: 'Package' },
  { id: 'catalog', label: 'Каталог', icon: 'LayoutGrid' },
  { id: 'analytics', label: 'Аналитика', icon: 'TrendingUp' },
  { id: 'search', label: 'Поиск', icon: 'Search' },
  { id: 'friends', label: 'Друзья', icon: 'Users' },
];

const SKIN_DATA = [
  {
    id: 1,
    name: 'AK-47 | Азимов',
    wear: 'Прямо с завода',
    wearValue: 0.03,
    price: 12400,
    priceChange: +5.2,
    rarity: 'ancient',
    rarityLabel: 'Тайное',
    pattern: 661,
    isRare: true,
    rareNote: '661 — редкий флот, топ 0.5%',
    image: AK47_IMG,
    float: '0.032',
  },
  {
    id: 2,
    name: 'AWP | Дракон Огнедышащий',
    wear: 'Немного поношенное',
    wearValue: 0.18,
    price: 89700,
    priceChange: -1.8,
    rarity: 'contraband',
    rarityLabel: 'Контрабанда',
    pattern: 4,
    isRare: true,
    rareNote: 'Pattern #4 — эксклюзивный паттерн',
    image: AWP_IMG,
    float: '0.182',
  },
  {
    id: 3,
    name: 'M4A4 | Вой',
    wear: 'После полевых испытаний',
    wearValue: 0.34,
    price: 3200,
    priceChange: +0.4,
    rarity: 'mythical',
    rarityLabel: 'Запрещённое',
    pattern: 230,
    isRare: false,
    rareNote: '',
    image: M4A4_IMG,
    float: '0.341',
  },
  {
    id: 4,
    name: 'Desert Eagle | Blaze',
    wear: 'Прямо с завода',
    wearValue: 0.01,
    price: 28500,
    priceChange: +12.1,
    rarity: 'legendary',
    rarityLabel: 'Засекреченное',
    pattern: 1,
    isRare: true,
    rareNote: 'Full Blaze — максимальный огонь',
    image: AK47_IMG,
    float: '0.009',
  },
  {
    id: 5,
    name: 'Karambit | Леопард',
    wear: 'Закалённое в боях',
    wearValue: 0.58,
    price: 15600,
    priceChange: -3.1,
    rarity: 'rare',
    rarityLabel: 'Редкое',
    pattern: 88,
    isRare: false,
    rareNote: '',
    image: M4A4_IMG,
    float: '0.578',
  },
  {
    id: 6,
    name: 'Glock-18 | Fade',
    wear: 'Прямо с завода',
    wearValue: 0.02,
    price: 7800,
    priceChange: +2.3,
    rarity: 'legendary',
    rarityLabel: 'Засекреченное',
    pattern: 999,
    isRare: true,
    rareNote: '100% Fade — полный градиент',
    image: AWP_IMG,
    float: '0.021',
  },
];

const FRIENDS_DATA = [
  { id: 1, name: 'xX_Shadow_Xx', avatar: '🎯', total: 245000, items: 47, online: true, trend: +8.4 },
  { id: 2, name: 'ProSniper_RU', avatar: '🔫', total: 89400, items: 23, online: true, trend: -2.1 },
  { id: 3, name: 'cs2_collector', avatar: '⚔️', total: 1240000, items: 312, online: false, trend: +15.7 },
  { id: 4, name: 'knife_hunter', avatar: '🗡️', total: 340000, items: 88, online: false, trend: +3.2 },
];

function WearIndicator({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-[4px] rounded-sm overflow-hidden bg-[#1a1a1a]">
        <div className="wear-bar absolute inset-0" />
        <div
          className="absolute top-0 bottom-0 right-0 bg-[#0a0a0a]"
          style={{ width: `${100 - pct}%` }}
        />
        <div
          className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-white/80"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono w-8">{value.toFixed(3)}</span>
    </div>
  );
}

function SkinCard({ skin, compact = false }: { skin: typeof SKIN_DATA[0]; compact?: boolean }) {
  const priceUp = skin.priceChange > 0;
  return (
    <div
      className={`
        group relative bg-card steel-border card-hover rounded overflow-hidden
        ${skin.isRare ? `border-rarity-${skin.rarity}` : ''}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      {skin.isRare && (
        <div className={`absolute top-0 left-0 right-0 h-[2px] rarity-${skin.rarity} bg-current opacity-80`} />
      )}

      <div className={`relative mb-3 rounded overflow-hidden bg-[#0d0d0d] ${compact ? 'h-28' : 'h-36'}`}>
        <img
          src={skin.image}
          alt={skin.name}
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        />
        {skin.isRare && (
          <div className="absolute top-2 right-2">
            <span className="text-[9px] font-display font-bold tracking-wider px-1.5 py-0.5 rounded bg-black/80 rarity-contraband border border-current/30">
              RARE
            </span>
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <span className={`text-[9px] font-display font-semibold tracking-wider rarity-${skin.rarity}`}>
            {skin.rarityLabel.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className={`font-display font-semibold text-foreground leading-tight ${compact ? 'text-sm' : 'text-base'}`}>
          {skin.name}
        </h3>
        <p className="text-[11px] text-muted-foreground">{skin.wear}</p>

        <WearIndicator value={skin.wearValue} />

        {skin.isRare && !compact && (
          <div className="flex items-start gap-1.5 mt-1 p-2 rounded bg-[#0d0d0d] border border-yellow-500/20">
            <span className="text-yellow-400 text-[10px] mt-0.5">⭐</span>
            <p className="text-[10px] text-yellow-400/80 leading-snug">{skin.rareNote}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div>
            <span className={`font-display font-bold text-foreground ${compact ? 'text-base' : 'text-lg'}`}>
              {skin.price.toLocaleString('ru')} ₽
            </span>
          </div>
          <span className={`text-[11px] font-medium ${priceUp ? 'text-green-400' : 'text-red-400'}`}>
            {priceUp ? '+' : ''}{skin.priceChange}%
          </span>
        </div>

        {!compact && (
          <div className="flex items-center gap-3 pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">
              Паттерн: <span className="text-foreground/70">#{skin.pattern}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              Float: <span className="font-mono text-foreground/70">{skin.float}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePage({ steamData, loading, error, onLoad }: {
  steamData: SteamData | null;
  loading: boolean;
  error: string;
  onLoad: (input: string) => void;
}) {
  const [input, setInput] = useState('');

  const rareItems = steamData
    ? steamData.inventory.filter(i => ['contraband', 'ancient', 'legendary'].includes(i.rarity))
    : SKIN_DATA.filter(s => s.isRare);

  const typeCount = (keyword: string) =>
    steamData ? steamData.inventory.filter(i => i.type?.toLowerCase().includes(keyword)).length : 0;

  const PROGRESS_CATS = [
    { cat: 'Пистолеты', keyword: 'pistol', total: 24, color: '#6b8fb5' },
    { cat: 'Винтовки', keyword: 'rifle', total: 30, color: '#8b6db5' },
    { cat: 'Ножи', keyword: 'knife', total: 18, color: '#e4ae39' },
    { cat: 'Перчатки', keyword: 'glove', total: 8, color: '#6bb56b' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded steel-border bg-card p-6">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="relative flex items-start gap-5">
          {steamData?.player.avatar ? (
            <img src={steamData.player.avatar} alt="avatar"
              className="w-20 h-20 rounded-lg object-cover steel-border shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-[#111] steel-border flex items-center justify-center text-4xl shrink-0">🎯</div>
          )}
          <div className="flex-1 min-w-0">
            {steamData ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">{steamData.player.name}</h2>
                  <span className="text-[10px] font-display font-bold px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 tracking-wider">ONLINE</span>
                </div>
                <p className="text-muted-foreground text-sm mb-3">
                  {steamData.total} предметов · Steam ID: <span className="font-mono text-foreground/60">{steamData.steam_id}</span>
                </p>
                <button onClick={() => { setInput(''); }} className="flex items-center gap-2 px-3 py-1.5 rounded bg-card steel-border text-muted-foreground text-xs font-display hover:text-foreground transition-colors">
                  <Icon name="LogOut" size={12} /> Сменить профиль
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">Steam не привязан</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-3">Введите Steam ID (17 цифр) или ник из URL профиля</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="76561198000000000 или nickname"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && input && onLoad(input)}
                    className="flex-1 bg-[#0d0d0d] steel-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-steel/40 transition-colors font-mono"
                  />
                  <button
                    onClick={() => input && onLoad(input)}
                    disabled={loading || !input}
                    className="px-4 py-2 rounded bg-[#1b2838] hover:bg-[#2a475e] text-white text-sm font-display font-semibold tracking-wide transition-colors border border-[#2a475e] disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <span>🎮</span>}
                    {loading ? 'Загрузка...' : 'Загрузить'}
                  </button>
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Предметов', value: steamData ? steamData.total.toString() : SKIN_DATA.length.toString(), icon: 'Package', color: 'text-foreground' },
          { label: 'Редких', value: rareItems.length.toString(), icon: 'Star', color: 'text-yellow-400' },
          { label: 'Ножей', value: steamData ? typeCount('knife').toString() : '2', icon: 'Sword', color: 'text-steel' },
          { label: 'Перчаток', value: steamData ? typeCount('glove').toString() : '0', icon: 'Award', color: 'text-purple-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-card steel-border rounded p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Icon name={stat.icon} size={14} className="text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-display tracking-wider uppercase">{stat.label}</span>
            </div>
            <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card steel-border rounded p-4">
        <h3 className="font-display text-base font-semibold text-foreground mb-4 tracking-wide flex items-center gap-2">
          <Icon name="BarChart3" size={16} className="text-steel" />
          Прогресс заполнения инвентаря
        </h3>
        <div className="space-y-3">
          {PROGRESS_CATS.map(cat => {
            const current = steamData ? typeCount(cat.keyword) : (cat.cat === 'Винтовки' ? 12 : cat.cat === 'Пистолеты' ? 8 : cat.cat === 'Ножи' ? 2 : 0);
            return (
              <div key={cat.cat} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/80 font-display tracking-wide">{cat.cat}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{current}/{cat.total}</span>
                </div>
                <div className="h-[6px] rounded-full bg-[#111] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((current / cat.total) * 100, 100)}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SteamItemCard({ item }: { item: SteamItem }) {
  const rarityColorMap: Record<string, string> = {
    contraband: '#e4ae39', ancient: '#eb4b4b', legendary: '#d32ee6',
    mythical: '#8847ff', rare: '#4b69ff', uncommon: '#5e98d9', common: '#b0b0b0',
  };
  const color = item.rarity_color ? `#${item.rarity_color}` : rarityColorMap[item.rarity] || '#888';

  return (
    <div className="group relative bg-card rounded overflow-hidden card-hover" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: `${color}33` }}>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: color, opacity: 0.7 }} />
      <div className="relative h-32 bg-[#0d0d0d] overflow-hidden">
        <img src={item.image} alt={item.display_name}
          className="w-full h-full object-contain p-2 opacity-85 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-1 left-2">
          <span className="text-[9px] font-display font-semibold tracking-wider" style={{ color }}>
            {item.rarity_label?.toUpperCase() || item.rarity.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="font-display font-semibold text-foreground text-sm leading-tight line-clamp-2">{item.display_name}</h3>
        {item.wear && <p className="text-[10px] text-muted-foreground">{item.wear}</p>}
        {item.float !== null && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 h-[3px] rounded-sm overflow-hidden bg-[#1a1a1a]">
              <div className="wear-bar absolute inset-0" />
              <div className="absolute top-0 bottom-0 right-0 bg-[#0a0a0a]"
                style={{ width: `${100 - Math.round((item.float || 0) * 100)}%` }} />
            </div>
            <span className="text-[9px] text-muted-foreground font-mono">{item.float?.toFixed(3)}</span>
          </div>
        )}
        {item.pattern !== null && (
          <p className="text-[10px] text-muted-foreground">Паттерн: <span className="text-foreground/60">#{item.pattern}</span></p>
        )}
      </div>
    </div>
  );
}

function InventoryPage({ steamData }: { steamData: SteamData | null }) {
  const rareItems = steamData
    ? steamData.inventory.filter(i => ['contraband', 'ancient', 'legendary'].includes(i.rarity))
    : SKIN_DATA.filter(s => s.isRare);

  const hasSteam = !!steamData;
  const itemCount = hasSteam ? steamData.total : SKIN_DATA.length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">Инвентарь</h2>
          <p className="text-sm text-muted-foreground">
            {itemCount} предметов{hasSteam ? ` · Steam: ${steamData.player.name}` : ' · демо-данные'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded bg-card steel-border text-muted-foreground text-sm hover:text-foreground transition-colors flex items-center gap-1.5">
            <Icon name="SlidersHorizontal" size={13} />
            Фильтры
          </button>
        </div>
      </div>

      {rareItems.length > 0 && (
        <div className="bg-card rounded p-3 border-l-2 border-yellow-500/50" style={{ border: '1px solid #3a3a2a', borderLeftWidth: 2 }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400 text-sm">⭐</span>
            <span className="font-display text-sm font-semibold text-yellow-400/90 tracking-wide">
              Редкие находки ({rareItems.length})
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {hasSteam
              ? (rareItems as SteamItem[]).map(item => (
                <span key={item.assetid} className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400/80 border border-yellow-500/20">
                  {item.display_name}
                </span>
              ))
              : (rareItems as typeof SKIN_DATA).map(item => (
                <span key={item.id} className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400/80 border border-yellow-500/20">
                  {item.name} — {item.rareNote}
                </span>
              ))
            }
          </div>
        </div>
      )}

      {hasSteam ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {steamData.inventory.map(item => (
            <SteamItemCard key={item.assetid} item={item} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 p-3 rounded bg-[#111] steel-border text-muted-foreground text-xs">
            <Icon name="Info" size={13} />
            Подключи Steam в разделе «Профиль» для просмотра реального инвентаря
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {SKIN_DATA.map(skin => (
              <SkinCard key={skin.id} skin={skin} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CatalogPage() {
  const categories = ['Все', 'Пистолеты', 'Винтовки', 'Ножи', 'Перчатки', 'SMG'];
  const [activeCategory, setActiveCategory] = useState('Все');

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">Каталог</h2>
        <p className="text-sm text-muted-foreground">Все скины CS2 с ценами и паттернами</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded text-sm font-display font-medium tracking-wide transition-all ${
              activeCategory === cat
                ? 'bg-steel/20 text-steel border border-steel/30'
                : 'bg-card steel-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {SKIN_DATA.concat(SKIN_DATA).slice(0, 10).map((skin, i) => (
          <SkinCard key={`${skin.id}-${i}`} skin={skin} compact />
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage({ steamData }: { steamData: SteamData | null }) {
  const totalValue = SKIN_DATA.reduce((acc, s) => acc + s.price, 0);
  const avgChange = SKIN_DATA.reduce((acc, s) => acc + s.priceChange, 0) / SKIN_DATA.length;
  const realTotal = steamData?.total ?? 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">Аналитика</h2>
        <p className="text-sm text-muted-foreground">Отслеживание цен и динамика рынка</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Стоимость (демо)', value: `${totalValue.toLocaleString('ru')} ₽`, delta: '+5.2%', up: true },
          { label: steamData ? 'Предметов в Steam' : 'Средний рост', value: steamData ? realTotal.toString() : `${avgChange.toFixed(1)}%`, delta: steamData ? 'реальный инвентарь' : 'за 7 дней', up: avgChange > 0 },
          { label: 'Топ скин', value: 'AWP Dragon', delta: '+12.1%', up: true },
        ].map(m => (
          <div key={m.label} className="bg-card steel-border rounded p-4 space-y-1">
            <p className="text-[11px] text-muted-foreground font-display tracking-wider uppercase">{m.label}</p>
            <p className="font-display text-xl font-bold text-foreground">{m.value}</p>
            <p className={`text-[11px] font-medium ${m.up ? 'text-green-400' : 'text-red-400'}`}>{m.delta}</p>
          </div>
        ))}
      </div>

      <div className="bg-card steel-border rounded p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 tracking-wide flex items-center gap-2">
          <Icon name="TrendingUp" size={14} className="text-steel" />
          Динамика цен (30 дней)
        </h3>
        <div className="h-32 flex items-end gap-1">
          {[42, 38, 51, 47, 55, 52, 61, 58, 65, 59, 70, 68, 75, 72, 80, 77, 85, 82, 88, 84, 90, 87, 93, 89, 96, 92, 98, 94, 100, 97].map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-steel/20 hover:bg-steel/40 transition-colors cursor-pointer"
              style={{ height: `${v}%` }}
              title={`День ${i + 1}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">1 апр</span>
          <span className="text-[10px] text-muted-foreground">Сегодня</span>
        </div>
      </div>

      <div className="bg-card steel-border rounded p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 tracking-wide">Топ движения цен</h3>
        <div className="space-y-2">
          {[...SKIN_DATA].sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange)).map(skin => (
            <div key={skin.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <span className="text-sm text-foreground/80">{skin.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground font-mono">{skin.price.toLocaleString('ru')} ₽</span>
                <span className={`text-sm font-medium font-display ${skin.priceChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {skin.priceChange > 0 ? '+' : ''}{skin.priceChange}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchPage({ steamData }: { steamData: SteamData | null }) {
  const [query, setQuery] = useState('');
  const filtered = query.length > 1
    ? steamData
      ? steamData.inventory.filter(s => s.name.toLowerCase().includes(query.toLowerCase()) || s.display_name.toLowerCase().includes(query.toLowerCase()))
      : SKIN_DATA.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">Поиск</h2>
        <p className="text-sm text-muted-foreground">Найди скин по названию, флоту или паттерну</p>
      </div>

      <div className="relative">
        <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="AK-47 Азимов, паттерн #661..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-card steel-border rounded px-10 py-3 text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-steel/40 transition-colors font-body"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <Icon name="X" size={14} className="text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['AK-47', 'AWP', 'Knife', 'Fade', 'Doppler', 'Asiimov'].map(tag => (
          <button
            key={tag}
            onClick={() => setQuery(tag)}
            className="px-2.5 py-1 rounded bg-card steel-border text-muted-foreground text-xs font-display hover:text-foreground transition-colors"
          >
            {tag}
          </button>
        ))}
      </div>

      {query.length > 1 && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icon name="SearchX" size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-display text-sm">Ничего не найдено</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {steamData
                ? (filtered as SteamItem[]).map(item => <SteamItemCard key={item.assetid} item={item} />)
                : (filtered as typeof SKIN_DATA).map(skin => <SkinCard key={skin.id} skin={skin} />)
              }
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-card steel-border rounded p-4">
            <p className="font-display text-sm text-muted-foreground mb-3 tracking-wide">ПОПУЛЯРНЫЕ ЗАПРОСЫ</p>
            <div className="space-y-1">
              {['AWP | Medusa', 'Karambit | Gamma Doppler', 'AK-47 | Fire Serpent', 'M4A4 | Посейдон'].map(q => (
                <button key={q} onClick={() => setQuery(q)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary text-sm text-foreground/70 hover:text-foreground transition-colors flex items-center gap-2">
                  <Icon name="Clock" size={12} className="text-muted-foreground" />
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-card steel-border rounded p-4">
            <p className="font-display text-sm text-muted-foreground mb-3 tracking-wide">РЕДКИЕ ПАТТЕРНЫ</p>
            <div className="space-y-1.5">
              {[
                { name: 'AK-47 Азимов #661', badge: 'Флот' },
                { name: 'AWP Dragon #4', badge: 'Топ 1%' },
                { name: 'Glock Fade 100%', badge: 'Full Fade' },
              ].map(p => (
                <div key={p.name} className="flex items-center justify-between py-1">
                  <span className="text-sm text-foreground/70">{p.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    {p.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FriendsPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground tracking-wide">Друзья</h2>
          <p className="text-sm text-muted-foreground">Сравнение инвентарей и достижений</p>
        </div>
        <button className="px-3 py-1.5 rounded bg-card steel-border text-muted-foreground text-sm hover:text-foreground transition-colors flex items-center gap-1.5">
          <Icon name="UserPlus" size={13} />
          Добавить
        </button>
      </div>

      <div className="grid gap-3">
        {FRIENDS_DATA.map((friend, i) => (
          <div key={friend.id} className="bg-card steel-border rounded p-4 card-hover flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-[#111] steel-border flex items-center justify-center text-2xl">
                {friend.avatar}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-card ${friend.online ? 'bg-green-400' : 'bg-[#333]'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-foreground tracking-wide">{friend.name}</span>
                {i === 2 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-display">ТОП</span>}
              </div>
              <p className="text-[11px] text-muted-foreground">{friend.items} предметов</p>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-foreground">{friend.total.toLocaleString('ru')} ₽</p>
              <p className={`text-[11px] font-medium ${friend.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {friend.trend > 0 ? '+' : ''}{friend.trend}%
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card steel-border rounded p-4">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 tracking-wide flex items-center gap-2">
          <Icon name="BarChart2" size={14} className="text-steel" />
          Сравнение инвентарей
        </h3>
        <div className="space-y-3">
          {FRIENDS_DATA.map(f => {
            const max = Math.max(...FRIENDS_DATA.map(x => x.total));
            const pct = (f.total / max) * 100;
            return (
              <div key={f.id} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground/80 font-display">{f.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{f.total.toLocaleString('ru')} ₽</span>
                </div>
                <div className="h-[5px] rounded-full bg-[#111] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-steel/50 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [steamData, setSteamData] = useState<SteamData | null>(null);
  const [steamLoading, setSteamLoading] = useState(false);
  const [steamError, setSteamError] = useState('');

  const loadSteam = useCallback(async (input: string) => {
    setSteamLoading(true);
    setSteamError('');
    try {
      const param = input.length === 17 && /^\d+$/.test(input) ? 'steamid' : 'vanity';
      const res = await fetch(`${STEAM_API_URL}?${param}=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      setSteamData(data);
    } catch (e) {
      setSteamError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setSteamLoading(false);
    }
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'profile': return <ProfilePage steamData={steamData} loading={steamLoading} error={steamError} onLoad={loadSteam} />;
      case 'inventory': return <InventoryPage steamData={steamData} />;
      case 'catalog': return <CatalogPage />;
      case 'analytics': return <AnalyticsPage steamData={steamData} />;
      case 'search': return <SearchPage steamData={steamData} />;
      case 'friends': return <FriendsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] grid-bg">
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-steel/20 border border-steel/30 flex items-center justify-center">
                <span className="text-steel text-xs font-display font-bold">V</span>
              </div>
              <span className="font-display font-bold text-lg text-foreground tracking-widest">CS2 VAULT</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`
                    nav-item flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-display font-medium tracking-wide transition-all
                    ${activeTab === item.id
                      ? 'text-steel bg-steel/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }
                  `}
                >
                  <Icon name={item.icon} size={14} />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <button className="p-2 rounded bg-card steel-border hover:border-steel/30 transition-colors">
                <Icon name="Bell" size={15} className="text-muted-foreground" />
              </button>
              <button className="px-3 py-1.5 rounded bg-[#1b2838] hover:bg-[#2a475e] text-white text-xs font-display font-semibold tracking-wide transition-colors border border-[#2a475e] flex items-center gap-1.5">
                <span className="text-sm">🎮</span> Steam
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="md:hidden sticky top-14 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex overflow-x-auto px-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-3 text-xs font-display font-medium tracking-wide transition-all border-b-2
                ${activeTab === item.id
                  ? 'text-steel border-steel'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
                }
              `}
            >
              <Icon name={item.icon} size={13} />
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {renderPage()}
      </main>
    </div>
  );
}