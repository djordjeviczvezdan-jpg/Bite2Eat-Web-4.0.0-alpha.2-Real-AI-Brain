export type BasketUpdate = {
  id: number;
  quantity: number;
  modifiers?: string[];
};

export type AIOrderResponse = {
  reply: string;
  basket: BasketUpdate[];
  suggestions: number[];
};
