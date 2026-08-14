import "micromark-util-types";

declare module "micromark-util-types" {
  interface TokenTypeMap {
    localLink: "localLink";
    localLinkMarker: "localLinkMarker";
    localLinkLabel: "localLinkLabel";
    localLinkTarget: "localLinkTarget";
  }
}