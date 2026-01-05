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
  event: Event;
  element: Element;
  emit: EmitSpec | null;
  eval: string | null;
  config: RequestConfig | null;
  spec: EventSpec;
};

export type EmitSpec = {
  event: string;
  delay: number;
};
