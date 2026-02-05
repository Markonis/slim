export type SwapStrategy = "inner" | "outer";

export type EventSpec = {
  selector?: string;
  event: string;
};

export type PrepareFormDataResult = {
  url: string;
  body: FormData | null;
};

export type RequestResult = {
  event: string | null;
  status: number;
  html: string | null;
  text: string | null;
  targets: Element[];
  swapStrategy: SwapStrategy;
  pushUrl: string | null;
};

export type RequestConfig = {
  url: string;
  method: string;
};

export type SendRequestParams = {
  event: Event;
  url: string;
  method: string;
  element: Element;
  targetSelector: string | null;
  swapStrategy: SwapStrategy;
};

export type HandleTemplateParams = {
  element: Element;
  templateSelector: string | null;
  targetSelector: string | null;
  swapStrategy: SwapStrategy;
  observeElementsWithAppearEvent: (element: Element) => void;
};

export type EventHandler = {
  event: Event;
  element: Element;
  emitSpec: EmitSpec | null;
  evalCode: string | null;
  requestConfig: RequestConfig | null;
  eventSpec: EventSpec;
  templateSelector: string | null;
  targetSelector: string | null;
  swapStrategy: SwapStrategy;
  pushUrl: string | null;
};

export type EmitSpec = {
  event: string;
  delay: number;
};

export type PerformSwapParams = {
  content: string;
  element: Element;
  targetSelector: string | null;
  swapStrategy: SwapStrategy;
  observeElementsWithAppearEvent: (element: Element) => void;
};
