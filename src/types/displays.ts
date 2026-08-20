export type DisplayBoardMode = "ROOMS" | "PEOPLE" | "BOTH";

export type DisplayDevice = {
  id: string;
  name: string;
  boardMode: DisplayBoardMode;
  isActive: boolean;
  lastSeenAt?: string | null;
  pairingPending?: boolean;
  pairingCode?: string;
  pairingExpiresAt?: string;
  office: { id: string; name: string; timezone?: string };
};

export type DisplayDeviceList = {
  items: DisplayDevice[];
};

export type DisplayPairing = {
  id: string;
  pairingCode: string;
  pairingExpiresAt: string;
};
