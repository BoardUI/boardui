"use client";

import { RiNotificationLine } from "@remixicon/react";
import { useRef, useState } from "react";
import { Dialog, Popover } from "react-aria-components";

import { STARTER_NOTIFICATIONS } from "@/components/application/app-shell/starter-notifications";
import {
  NotificationCenter,
  type NotificationCenterItem,
} from "@/components/application/notification-center/notification-center";
import { IconButton } from "@/components/base/buttons/icon-button";
import { useDismissOnOutsidePress } from "@/utils/use-dismiss-on-outside-press";

/** The header's bell: unread count on the glyph, the notification center in a popover. */
export function NotificationBell({
  notifications = STARTER_NOTIFICATIONS,
}: {
  notifications?: NotificationCenterItem[];
} = {}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const unread = notifications.filter((item) => item.unread).length;

  useDismissOnOutsidePress(isOpen, () => setIsOpen(false), [triggerRef, popoverRef]);

  return (
    <>
      <span className="group relative inline-flex">
        <IconButton
          ref={triggerRef}
          icon={RiNotificationLine}
          size="medium"
          aria-label="Notifications"
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          onClick={() => setIsOpen((open) => !open)}
        />
        {unread > 0 && (
          <span className="pointer-events-none absolute top-0.5 left-[18px] flex size-4 items-center justify-center rounded-full border-[1.5px] border-background-primary-default bg-red-600 group-hover:border-0 group-active:border-0">
            <span className="w-4 text-center text-[10px] leading-4 font-bold text-white">{unread}</span>
          </span>
        )}
      </span>
      <Popover
        ref={popoverRef}
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        placement="bottom end"
        offset={8}
        isNonModal
        className="z-50 w-[440px] max-w-[calc(100vw-24px)] outline-none"
      >
        <Dialog aria-label="Notifications" className="outline-none">
          <NotificationCenter notifications={notifications} />
        </Dialog>
      </Popover>
    </>
  );
}
