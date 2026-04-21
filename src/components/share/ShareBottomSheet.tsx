import React, { useState } from "react";
import { Sheet, Box, Text, Icon } from "zmp-ui";
import { useAtom } from "jotai";
import { openShareSheet, openPostFeed } from "zmp-sdk/apis";
import { shareSheetStateAtom } from "@/state/share";
import "./ShareBottomSheet.scss";

import iconCopy from "@/static/icons/icon-copy.svg";
import iconLink from "@/static/icons/icon-link.svg";
import iconPlus from "@/static/icons/icon-plus.svg";
import iconZalo from "@/static/icons/social-zalo.svg";
import iconFacebook from "@/static/icons/social-facebook.svg";
import iconTiktok from "@/static/icons/social-tiktok.svg";
import iconInstagram from "@/static/icons/social-instagram.svg";
import iconYoutube from "@/static/icons/social-youtube.svg";

const ShareBottomSheet: React.FC = () => {
  const [shareState, setShareState] = useAtom(shareSheetStateAtom);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const closeSheet = () => {
    setShareState((prev) => ({ ...prev, visible: false }));
    setCopied(false);
  };

  const getFullShareText = () => {
    const content = shareState.shareContent || "";
    const url = shareState.shareUrl || "";
    return url ? `${content}\n${url}` : content;
  };

  const handleCopy = async () => {
    const text = getFullShareText();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.top = "0";
        el.style.left = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[Share] Copy failed:", err);
    }
  };

  const handleShareZalo = async () => {
    setSharing(true);
    try {
      // Dùng zmp_deep_link để share Mini App page trực tiếp trong Zalo
      await openShareSheet({
        type: "zmp_deep_link",
        data: {
          title: shareState.campaignName || "Chia sẻ link kiếm tiền",
          description: shareState.shareContent || "",
          thumbnail: shareState.campaignLogo || "",
          path: shareState.campaignPath || "/",
        },
      });
    } catch (err) {
      console.warn("[Share] Zalo openShareSheet (zmp_deep_link) failed:", err);
      // Fallback: thử share dạng link thường
      try {
        if (shareState.shareUrl) {
          await openShareSheet({ type: "link", data: { link: shareState.shareUrl } });
        }
      } catch {
        handleCopy();
      }
    } finally {
      setSharing(false);
    }
  };

  const handleShareFacebook = () => {
    const url = encodeURIComponent(shareState.shareUrl || "");
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareState.shareContent || "Chia sẻ link kiếm tiền",
          text: getFullShareText(),
          url: shareState.shareUrl,
        });
      } catch (err) {
        console.warn("[Share] Native share cancelled:", err);
      }
    } else {
      handleCopy();
    }
  };

  const socialPlatforms = [
    { id: "zalo", label: "Zalo", icon: iconZalo, isImg: true, handler: handleShareZalo },
    { id: "facebook", label: "Facebook", icon: iconFacebook, isImg: true, handler: handleShareFacebook },
    { id: "tiktok", label: "Tiktok", icon: iconTiktok, isImg: true, handler: handleShareNative },
    { id: "instagram", label: "Instagram", icon: iconInstagram, isImg: true, handler: handleShareNative },
    { id: "youtube", label: "Youtube", icon: iconYoutube, isImg: true, handler: handleShareNative },
  ];

  const utilityActions = [
    { id: "copy-link", label: "Sao chép", icon: iconLink, handler: handleCopy },
    { id: "more", label: "Thêm", icon: iconPlus, handler: handleShareNative },
  ];

  return (
    <Sheet
      visible={shareState.visible}
      onClose={closeSheet}
      autoHeight
      swipeToClose
      className="share-bottom-sheet"
    >
      {/* Header */}
      <div className="share-sheet__header">
        <span className="share-sheet__title">Chia sẻ</span>
        <div className="share-sheet__close" onClick={closeSheet}>
          <Icon icon="zi-close" size={20} />
        </div>
      </div>
      <div className="share-sheet__divider" />

      {/* Copy content section */}
      <div className="share-sheet__body">
        <div className="share-sheet__copy-row">
          <span className="share-sheet__copy-label">Sao chép nội dung chia sẻ</span>
          <div className="share-sheet__copy-btn" onClick={handleCopy}>
            <img src={iconCopy} alt="" width={16} height={16} />
            <span>{copied ? "Đã sao chép!" : "Sao chép"}</span>
          </div>
        </div>

        <div className="share-sheet__text-preview" style={{ whiteSpace: "pre-wrap" }}>
          {getFullShareText() || "Chọn chiến dịch để tạo nội dung chia sẻ"}
        </div>

        {/* Social platforms grid */}
        <div className="share-sheet__socials">
          {socialPlatforms.map((p) => (
            <div key={p.id} className="share-sheet__social-item" onClick={() => !sharing && p.handler()}>
              <div className={`share-sheet__social-icon share-sheet__social-icon--${p.id}`}>
                <img src={p.icon} alt={p.label} width={48} height={48} />
              </div>
              <span className="share-sheet__social-label">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Utility actions (copy link + more) */}
        <div className="share-sheet__utilities">
          {utilityActions.map((a) => (
            <div key={a.id} className="share-sheet__social-item" onClick={() => !sharing && a.handler()}>
              <div className="share-sheet__utility-icon">
                <img src={a.icon} alt={a.label} width={20} height={20} />
              </div>
              <span className="share-sheet__social-label">{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
};

export default ShareBottomSheet;
