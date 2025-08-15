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
  targets: Element[];
};

export type ElementConfig = {
  url: string;
  method: string;
};
