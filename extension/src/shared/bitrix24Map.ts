import type { ElementRecord } from './types';

// Built from Bitrix24 open-source core (github.com/avshatalov48/bitrix24-core-corp)
// Selectors are verified against actual component templates and JS source.
const BASE: Omit<ElementRecord, 'id' | 'capturedAt'>[] = [

  // ─── Global navigation ────────────────────────────────────────────────────
  { label: 'Главное меню (левая панель)', selector: '.side-panel-wrapper, #bx-left-menu, .menu-popup-frame', url: '*' },
  { label: 'Поиск по порталу', selector: '.global-search-input, input[name="q"][class*="search"]', url: '*' },
  { label: 'Уведомления (колокольчик)', selector: '.im-toolbar-btn-notify, [data-role="bx-im-toolbar-notify"]', url: '*' },
  { label: 'Профиль пользователя', selector: '.bx-userpic, .im-toolbar-btn-profile', url: '*' },

  // ─── CRM — общее ─────────────────────────────────────────────────────────
  { label: 'Кнопка Создать (добавить запись)', selector: '.ui-btn-split.ui-btn-success, .ui-btn.ui-btn-success.ui-btn-split', url: '/crm/' },
  { label: 'Кнопка Создать (основная часть)', selector: '.ui-btn-split.ui-btn-success .ui-btn-main', url: '/crm/' },
  { label: 'Кнопка Создать (стрелка меню)', selector: '.ui-btn-split.ui-btn-success .ui-btn-menu', url: '/crm/' },
  { label: 'Настройки CRM (шестерёнка)', selector: '.crm-robot-btn, [data-role="bx-crm-toolbar-settings"]', url: '/crm/' },
  { label: 'Фильтр (иконка воронки)', selector: '.ui-btn.ui-btn-icon-funnel, [data-role="main-ui-filter-btn"]', url: '/crm/' },
  { label: 'Поиск в списке CRM', selector: '.main-ui-filter-search input, .main-ui-filter-search-filter input', url: '/crm/' },
  { label: 'Импорт записей', selector: 'a[href*="import"], .ui-btn[data-role*="import"]', url: '/crm/' },
  { label: 'Экспорт в Excel', selector: 'a[href*="export"], .ui-btn[data-role*="export"]', url: '/crm/' },
  { label: 'Переключить вид (список/канбан)', selector: '[data-role="bx-crm-view-switcher"], .ui-nav-panel__item', url: '/crm/' },
  { label: 'Применить фильтр', selector: '.main-ui-filter-field-button.main-ui-filter-apply, button[data-role="main-ui-filter-submit"]', url: '/crm/' },
  { label: 'Сбросить фильтр', selector: '.main-ui-filter-reset-link, [data-role="main-ui-filter-reset"]', url: '/crm/' },
  { label: 'Сохранить фильтр', selector: '.main-ui-filter-field-button.main-ui-filter-save', url: '/crm/' },

  // ─── CRM — Лиды ──────────────────────────────────────────────────────────
  { label: 'Список лидов (меню)', selector: 'a[href*="/crm/lead/"], a[href*="CRM_LEAD"]', url: '/crm/' },
  { label: 'Создать лид', selector: '.ui-btn-split.ui-btn-success', url: '/crm/lead/' },
  { label: 'Конвертировать лид', selector: '.crm-entity-convert-btn, a[href*="lead"][href*="convert"]', url: '/crm/lead/' },
  { label: 'Строка лида в списке', selector: 'tr.main-grid-row[data-id], .crm-entity-stream-section', url: '/crm/lead/' },

  // ─── CRM — Сделки ─────────────────────────────────────────────────────────
  { label: 'Список сделок (меню)', selector: 'a[href*="/crm/deal/"], a[href*="CRM_DEAL"]', url: '/crm/' },
  { label: 'Создать сделку', selector: '.ui-btn-split.ui-btn-success', url: '/crm/deal/' },
  { label: 'Смена стадии сделки', selector: '.crm-kanban-item-stage, .crm-status-select', url: '/crm/deal/' },
  { label: 'Карточка сделки (канбан)', selector: '.crm-kanban-item, .crm-entity-card', url: '/crm/deal/' },
  { label: 'Колонка воронки (канбан)', selector: '.crm-kanban-column, .crm-kanban-column-header', url: '/crm/deal/' },

  // ─── CRM — Контакты ───────────────────────────────────────────────────────
  { label: 'Список контактов (меню)', selector: 'a[href*="/crm/contact/"]', url: '/crm/' },
  { label: 'Создать контакт', selector: '.ui-btn-split.ui-btn-success', url: '/crm/contact/' },
  { label: 'Поле Телефон в карточке', selector: 'input[name*="PHONE"], .crm-entity-field-phone input', url: '/crm/contact/' },
  { label: 'Поле Email в карточке', selector: 'input[name*="EMAIL"], .crm-entity-field-email input', url: '/crm/contact/' },

  // ─── CRM — Компании ───────────────────────────────────────────────────────
  { label: 'Список компаний (меню)', selector: 'a[href*="/crm/company/"]', url: '/crm/' },
  { label: 'Создать компанию', selector: '.ui-btn-split.ui-btn-success', url: '/crm/company/' },

  // ─── CRM — Карточка записи (detail) ──────────────────────────────────────
  { label: 'Сохранить карточку', selector: '.crm-entity-editor-btn-save, [data-role="entity-editor-save"], .ui-btn.ui-btn-success[data-action="save"]', url: '/crm/' },
  { label: 'Редактировать карточку', selector: '.crm-entity-editor-btn-edit, [data-role="entity-editor-edit"], .ui-btn[data-action="edit"]', url: '/crm/' },
  { label: 'Отмена редактирования', selector: '.crm-entity-editor-btn-cancel, [data-role="entity-editor-cancel"]', url: '/crm/' },
  { label: 'Добавить активность (дело)', selector: '.crm-entity-activity-btn, [data-role="crm-activity-add"], .ui-btn[data-entity="activity"]', url: '/crm/' },
  { label: 'Запланировать звонок', selector: '[data-role="crm-activity-call"], .crm-activity-call-btn', url: '/crm/' },
  { label: 'Написать письмо (email)', selector: '[data-role="crm-activity-email"], .crm-activity-email-btn', url: '/crm/' },
  { label: 'Добавить задачу', selector: '[data-role="crm-activity-task"], .crm-activity-task-btn', url: '/crm/' },
  { label: 'Добавить встречу', selector: '[data-role="crm-activity-meeting"], .crm-activity-meeting-btn', url: '/crm/' },
  { label: 'Поле Ответственный', selector: '[data-field-id="ASSIGNED_BY_ID"] input, .crm-entity-field-assigned input', url: '/crm/' },
  { label: 'Поле Стадия / Статус', selector: '[data-field-id="STAGE_ID"] select, .crm-entity-field-stage select', url: '/crm/' },

  // ─── Телефония / Колл-центр ───────────────────────────────────────────────
  { label: 'Позвонить (кнопка телефона)', selector: '.im-phone-call-btn-phone, .im-phone-call-btn-green, [data-role="telephony-call"]', url: '*' },
  { label: 'Завершить звонок', selector: '.im-phone-call-btn-red, [data-role="telephony-hangup"]', url: '*' },
  { label: 'Поставить на удержание', selector: '.im-phone-call-btn-hold, [data-role="telephony-hold"]', url: '*' },
  { label: 'Отключить микрофон', selector: '.im-phone-call-btn-mute, [data-role="telephony-mute"]', url: '*' },
  { label: 'Перевести звонок', selector: '.im-phone-call-btn-transfer, [data-role="telephony-transfer"]', url: '*' },
  { label: 'Клавиатура набора (цифры)', selector: '.im-phone-call-btn-dialpad, [data-role="telephony-keypad"]', url: '*' },
  { label: 'Окно звонка (карточка звонка)', selector: '.im-phone-call-container, [data-role="telephony-call-card"]', url: '*' },
  { label: 'CRM карточка во время звонка', selector: '.im-phone-call-crm-card, .im-phone-call-crm-buttons', url: '*' },
  { label: 'Создать лид из звонка', selector: '.im-phone-call-crm-button[data-entity="lead"]', url: '*' },
  { label: 'Создать контакт из звонка', selector: '.im-phone-call-crm-button[data-entity="contact"]', url: '*' },
  { label: 'История звонков', selector: 'a[href*="voximplant"][href*="call"], a[href*="telephony"]', url: '*' },

  // ─── Открытые линии (чат поддержки) ──────────────────────────────────────
  { label: 'Чат с клиентом (открытая линия)', selector: '.im-chat-open-line, [data-role="im-open-line"]', url: '*' },
  { label: 'Отправить сообщение в чате', selector: '.bx-im-message-form-send, [data-role="im-send-btn"]', url: '*' },
  { label: 'Поле ввода сообщения', selector: '.bx-im-message-form-text, [contenteditable="true"][data-role="message-input"]', url: '*' },

  // ─── Задачи ───────────────────────────────────────────────────────────────
  { label: 'Создать задачу', selector: '.ui-btn.ui-btn-success[href*="task/create"], .tasks-task-add-btn', url: '/tasks/' },
  { label: 'Мои задачи', selector: 'a[href*="/tasks/myplanner/"], a[href*="tasks_my"]', url: '/tasks/' },
  { label: 'Отметить задачу выполненной', selector: '.tasks-task-complete-btn, [data-action="complete"]', url: '/tasks/' },
  { label: 'Дедлайн задачи', selector: 'input[name*="DEADLINE"], .task-deadline-field input', url: '/tasks/' },
  { label: 'Ответственный за задачу', selector: 'input[name*="RESPONSIBLE"], [data-field="responsible"] input', url: '/tasks/' },

  // ─── Страница сотрудника / Контакты компании ──────────────────────────────
  { label: 'Написать сотруднику', selector: '.profile-btn-message, [data-role="im-open-chat"]', url: '/company/' },
  { label: 'Позвонить сотруднику', selector: '.profile-btn-call, [data-role="im-call-user"]', url: '/company/' },
];

// Turn the base list into ElementRecord[] with stable IDs
export const BITRIX24_ELEMENT_MAP: ElementRecord[] = BASE.map((item, i) => ({
  ...item,
  id: `bx24_builtin_${i}`,
  capturedAt: 0,
}));

// Returns only records matching the current page URL
export function getRelevantElements(pageUrl: string): ElementRecord[] {
  return BITRIX24_ELEMENT_MAP.filter(
    (r) => r.url === '*' || pageUrl.includes(r.url)
  );
}
