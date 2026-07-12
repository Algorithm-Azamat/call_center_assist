export interface GuideStep {
  stepNumber: number;
  instruction: string;   // Что сделать на этом шаге
  selector: string;      // CSS-селектор элемента (может быть пустым)
  selectorFallback: string; // Запасной текстовый поиск если селектор не найден
  isOptional: boolean;
}

export interface GuideResponse {
  query: string;
  steps: GuideStep[];
  summary: string;       // Краткое описание всего пути
}
