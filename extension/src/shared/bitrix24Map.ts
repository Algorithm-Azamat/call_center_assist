import type { ElementRecord } from './types';

// Selectors verified against Bitrix24 open-source core:
// github.com/avshatalov48/bitrix24-core-corp
// CSS classes from: kanban.css, entity-editor/style.css, crm-entity-show.css,
// toolbar template.php, voximplant phone-calls view.js

const BASE: Omit<ElementRecord, 'id' | 'capturedAt'>[] = [

  // ─── Левое меню (главная навигация — есть на каждой странице портала) ───
  { label: 'Меню: Контакт-центр', selector: '[data-id="menu_contact_center"] a, a[href*="/contact_center/"]', url: '*' },
  { label: 'Меню: CRM', selector: '[data-id="menu_crm"] a, a[href="/crm/"]', url: '*' },
  { label: 'Меню: Задачи и проекты', selector: '[data-id="menu_tasks"] a, a[href*="/tasks/"]', url: '*' },
  { label: 'Меню: Календарь', selector: '[data-id="menu_calendar"] a, a[href*="/calendar/"]', url: '*' },
  { label: 'Меню: Телефония', selector: '[data-id="menu_telephony"] a, a[href*="/telephony/"]', url: '*' },

  // ─── CRM Toolbar (верхняя панель в любом разделе CRM) ───────────────────
  { label: 'Кнопка Создать (добавить)', selector: '.ui-btn-split.ui-btn-success', url: '/crm/' },
  { label: 'Кнопка Создать — основная', selector: '.ui-btn-split.ui-btn-success .ui-btn-main', url: '/crm/' },
  { label: 'Кнопка Создать — выпадающее меню', selector: '.ui-btn-split.ui-btn-success .ui-btn-menu', url: '/crm/' },
  { label: 'Правые кнопки тулбара', selector: '.ui-toolbar-right-buttons', url: '/crm/' },
  { label: 'Кнопки фильтра', selector: '.ui-toolbar-filter-buttons', url: '/crm/' },
  { label: 'Заголовок раздела', selector: '.ui-toolbar-title-box', url: '/crm/' },
  { label: 'Настройки CRM', selector: '.crm-robot-btn, [data-role="bx-crm-toolbar-settings"]', url: '/crm/' },
  { label: 'Категории воронки', selector: '[data-role="bx-crm-toolbar-categories-button"]', url: '/crm/' },

  // ─── Канбан — сделки ────────────────────────────────────────────────────
  { label: 'Карточка сделки в канбане', selector: '.crm-kanban-item', url: '/crm/deal/' },
  { label: 'Заголовок карточки сделки', selector: '.crm-kanban-item-title', url: '/crm/deal/' },
  { label: 'Телефон на карточке', selector: '.crm-kanban-item-contact-phone', url: '/crm/deal/' },
  { label: 'Email на карточке', selector: '.crm-kanban-item-contact-email', url: '/crm/deal/' },
  { label: 'Счётчик активностей', selector: '.crm-kanban-item-activity-counter', url: '/crm/deal/' },
  { label: 'Добавить сделку в колонке', selector: '.crm-kanban-column-add-item-button', url: '/crm/deal/' },
  { label: 'Колонка канбана', selector: '.main-kanban-column', url: '/crm/deal/' },
  { label: 'Итого по колонке', selector: '.main-kanban-column-total-item', url: '/crm/deal/' },
  { label: 'Быстрая форма добавления', selector: '.crm-kanban-quick-form', url: '/crm/deal/' },
  { label: 'Поля карточки', selector: '.crm-kanban-item-fields', url: '/crm/deal/' },
  { label: 'Статус карточки', selector: '.crm-kanban-item-status', url: '/crm/deal/' },
  { label: 'Контактные действия на карточке', selector: '.crm-kanban-item-contact-center', url: '/crm/deal/' },

  // ─── Карточка сделки / контакта / лида (detail) ─────────────────────────
  { label: 'Блок с полями карточки', selector: '.crm-entity-card-widget', url: '/crm/' },
  { label: 'Заголовок секции карточки', selector: '.crm-entity-info-section-header', url: '/crm/' },
  { label: 'Поле карточки', selector: '.crm-entity-info-field', url: '/crm/' },
  { label: 'Стадия сделки', selector: '.crm-entity-info-field-deal-stage', url: '/crm/deal/' },
  { label: 'Ответственный в карточке', selector: '.crm-entity-info-field-person', url: '/crm/' },
  { label: 'Кнопка редактировать поле', selector: '.crm-entity-info-field-person-edit', url: '/crm/' },
  { label: 'Добавить виджет в карточку', selector: '.crm-entity-card-widget-add-btn-container', url: '/crm/' },

  // ─── Активности (дела) в карточке ───────────────────────────────────────
  { label: 'Попап добавления активности', selector: '.crm-activity-adding-popup', url: '/crm/' },
  { label: 'Список активностей', selector: '.crm-entity-card-widget[data-cid*="activity"]', url: '/crm/' },

  // ─── Телефония — виджет звонка ──────────────────────────────────────────
  { label: 'Окно звонка', selector: '.im-phone-call-container', url: '*' },
  { label: 'Шапка звонка (номер, имя)', selector: '.im-phone-call-header', url: '*' },
  { label: 'Кнопка Принять звонок (зелёная)', selector: '.im-phone-call-btn.im-phone-call-btn-green', url: '*' },
  { label: 'Кнопка Завершить звонок (красная)', selector: '.im-phone-call-btn.im-phone-call-btn-red', url: '*' },
  { label: 'Кнопка Удержание', selector: '.im-phone-call-btn-hold', url: '*' },
  { label: 'Кнопка Отключить микрофон', selector: '.im-phone-call-btn-mute', url: '*' },
  { label: 'Кнопка Перевести звонок', selector: '.im-phone-call-btn-transfer', url: '*' },
  { label: 'Кнопка Цифровая клавиатура', selector: '.im-phone-call-btn-dialpad', url: '*' },
  { label: 'Мини-панель активного звонка', selector: '.im-phone-call-panel-mini', url: '*' },
  { label: 'CRM карточка во время звонка', selector: '.im-phone-call-crm-card', url: '*' },
  { label: 'Кнопки CRM в окне звонка', selector: '.im-phone-call-crm-buttons', url: '*' },
  { label: 'Комментарий к звонку', selector: '.im-phone-call-comments-textarea', url: '*' },
  { label: 'Контейнер кнопок звонка', selector: '.im-phone-call-buttons-container', url: '*' },

  // ─── Фильтр ─────────────────────────────────────────────────────────────
  { label: 'Строка поиска', selector: '.main-ui-filter-search input, .main-ui-filter-field-search-input-wrapper input', url: '/crm/' },
  { label: 'Боковая панель фильтров', selector: '.main-ui-filter-sidebar', url: '/crm/' },
  { label: 'Кнопка фильтра в тулбаре', selector: '.ui-btn.ui-btn-icon-funnel', url: '/crm/' },
  { label: 'Сохранённый фильтр', selector: '.main-ui-filter-sidebar-item', url: '/crm/' },
  { label: 'Добавить фильтр', selector: '.main-ui-filter-sidebar-item.main-ui-filter-new-filter', url: '/crm/' },
];

export const BITRIX24_ELEMENT_MAP: ElementRecord[] = BASE.map((item, i) => ({
  ...item,
  id: `bx24_builtin_${i}`,
  capturedAt: 0,
}));

export function getRelevantElements(pageUrl: string): ElementRecord[] {
  return BITRIX24_ELEMENT_MAP.filter(
    (r) => r.url === '*' || pageUrl.includes(r.url)
  );
}
