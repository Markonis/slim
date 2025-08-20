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
};

export type RequestConfig = {
  url: string;
  method: string;
};

export type EventHandler = {
  element: Element;
  emit: string | null;
  config: RequestConfig | null;
  spec: EventSpec;
}
