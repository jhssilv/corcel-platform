export type AppEventName = "auth:unauthorized";

export interface UnauthorizedEvent extends Event {
	type: "auth:unauthorized";
}

export type AppEventMap = {
	"auth:unauthorized": UnauthorizedEvent;
};
