export interface Message {
  id?: string;
  content: string;
  role: "user" | "assistant" | "system";
}

export interface Chat {
  id: string;
  messages: Message[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
