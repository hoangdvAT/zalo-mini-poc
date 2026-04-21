import { atom } from "jotai";

export interface ShareSheetState {
  visible: boolean;
  campaignId?: string;
  campaignName?: string;
  campaignLogo?: string;
  campaignPath?: string; // e.g. "/job/34"
  shareContent?: string;
  shareUrl?: string;
}

export const shareSheetStateAtom = atom<ShareSheetState>({
  visible: false,
});
