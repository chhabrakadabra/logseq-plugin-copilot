export abstract class Message {
    constructor(
        public id: string = crypto.randomUUID(),
        public msg: string,
    ) { }

    abstract withChunk(chunk: string): Message;
}

export class HumanMessage extends Message {
    constructor(
        id: string,
        msg: string
    ) {
        super(id, msg);
    }

    withChunk(chunk: string): HumanMessage {
        return new HumanMessage(this.id, this.msg + chunk);
    }
}

export class AIMessage extends Message {
    constructor(
        id: string,
        msg: string
    ) {
        super(id, msg);
    }

    withChunk(chunk: string): AIMessage {
        return new AIMessage(this.id, this.msg + chunk);
    }
}
