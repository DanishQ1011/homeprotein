export interface NotificationPayload {
  object: string;
  entry: EntryEntity[];
}
export interface EntryEntity {
  id: string;
  changes: ChangesEntity[];
}
export interface ChangesEntity {
  value: Value;
  field: string;
}
export interface Value {
  messaging_product: string;
  metadata: Metadata;
  contacts?: ContactsEntity[] | null;
  messages?: MessagesEntity[] | null;
  statuses?: StatusesEntity[] | null;
}
export interface Metadata {
  display_phone_number: string;
  phone_number_id: string;
}
export interface ContactsEntity {
  profile: Profile;
  wa_id: string;
}
export interface Profile {
  name: string;
}
export interface MessagesEntity {
  context?: Context;
  interactive?: Interactive;
  from?: string;
  id: string;
  timestamp: string;
  text: Text;
  type: string;
  button: {
    payload: string;
    text: string;
  };
}

export interface Context {
  from: string;
  id: string;
}
export interface ButtonReply {
  id: string;
  title: string;
}

export interface Interactive {
  type: string;
  button_reply: ButtonReply;
  list_reply: ButtonReply;
}
export interface Text {
  body: string;
}
export interface StatusesEntity {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  conversation: Conversation;
  pricing: Pricing;
}
export interface Conversation {
  id: string;
  origin: Origin;
}
export interface Origin {
  type: string;
}
export interface Pricing {
  billable: boolean;
  pricing_model: string;
  category: string;
}

// interface Message {
//   text: string
// }

export class WhatsappHandler {
  phoneNumber?: string;
  isUserInitiated: boolean;
  isNewConversation: boolean;
  newMessage?: MessagesEntity;
  constructor(notification: NotificationPayload) {
    this.isNewConversation = Boolean(
      notification?.entry[0]?.changes[0]?.value?.statuses?.length
    );
    this.isUserInitiated = Boolean(
      notification?.entry[0].changes[0].value.statuses?.length
    );
    this.phoneNumber = notification.entry[0].changes[0]?.value?.messages?.length
      ? notification.entry[0].changes[0]?.value?.messages[0].from
      : "";
    this.newMessage = notification.entry[0].changes[0]?.value?.messages?.length
      ? notification.entry[0].changes[0]?.value?.messages[0]
      : undefined;
  }
}
