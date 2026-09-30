'use client';

/**
 * The only module in the project permitted to know which dialog library backs notifications and
 * confirmations. Every caller uses `notify.info`, `notify.error` or `notify.confirm` and nothing
 * else — see specs/004-portal-ui-overhaul/contracts/notify.md for the full behavioural contract
 * this module is held to. If SweetAlert2 ever needs replacing, this is the one file that changes.
 *
 * Every option used below was checked against the installed sweetalert2.d.ts before use, not
 * assumed from memory or from a search result — this library's public API differs across major
 * versions and a stale assumption fails silently at the type level, not at runtime.
 */

import type Swal2 from 'sweetalert2';

type SwalModule = typeof Swal2;

let swalPromise: Promise<SwalModule> | null = null;

// Loaded on first use, not at module scope: the library never ships to a page that never opens a
// dialog, and — combined with the 'use client' boundary above — it is never evaluated server-side.
function loadSwal(): Promise<SwalModule> {
  if (!swalPromise) {
    swalPromise = import('sweetalert2').then((mod) => mod.default);
  }
  return swalPromise;
}

const CLASSES = {
  popup: 'ipc-swal-popup',
  title: 'ipc-swal-title',
  htmlContainer: 'ipc-swal-body',
  actions: 'ipc-swal-actions',
  confirmButton: 'ipc-swal-confirm',
  cancelButton: 'ipc-swal-cancel',
} as const;

function popupClass(danger: boolean): string {
  return danger ? `${CLASSES.popup} ipc-swal-popup--danger` : CLASSES.popup;
}
function confirmClass(danger: boolean): string {
  return danger ? `${CLASSES.confirmButton} ipc-swal-confirm--danger` : CLASSES.confirmButton;
}

// SweetAlert2 renders its popup as a direct child of <body>, outside the React tree. If the user
// navigates back or forward while it is open, nothing in React unmounts it — it would otherwise
// sit orphaned on top of whatever page loads next. Closing it on `popstate` also resolves the
// pending promise to "not confirmed", so a confirmation abandoned by navigation cannot later
// resolve into executing the action it was guarding.
function withPopstateGuard<T>(swal: SwalModule, run: () => Promise<T>): Promise<T> {
  const onPopState = () => swal.close();
  window.addEventListener('popstate', onPopState);
  return run().finally(() => window.removeEventListener('popstate', onPopState));
}

// SweetAlert2 only wires Enter-to-confirm for its own `input`-mode dialogs -- checked against the
// installed bundle: `handleEnter` returns immediately whenever `innerParams.input` is unset, which
// is every dialog here. And a plain <button> outside a <form> responds natively to Space but not to
// a bare Enter in Chromium (verified: Space reliably activates the focused button; Enter does not).
// Space alone already satisfies "operable by keyboard", but Enter is the more common reflex, so it
// is wired up explicitly rather than left silently unsupported.
function activateFocusedButtonOnEnter(popup: HTMLElement): void {
  popup.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !popup.contains(target)) return;
    event.preventDefault();
    target.click();
  });
}

async function info(message: string, options: { title?: string } = {}): Promise<void> {
  const swal = await loadSwal();
  await withPopstateGuard(swal, () =>
    swal.fire({
      title: options.title ?? 'تنبيه',
      text: message,
      confirmButtonText: 'حسناً',
      buttonsStyling: false,
      didOpen: activateFocusedButtonOnEnter,
      customClass: {
        popup: popupClass(false),
        title: CLASSES.title,
        htmlContainer: CLASSES.htmlContainer,
        actions: CLASSES.actions,
        confirmButton: confirmClass(false),
      },
    }),
  );
}

async function error(message: string, options: { title?: string } = {}): Promise<void> {
  const swal = await loadSwal();
  await withPopstateGuard(swal, () =>
    swal.fire({
      title: options.title ?? 'حدث خطأ',
      text: message,
      confirmButtonText: 'حسناً',
      buttonsStyling: false,
      // Reported failures get the alertdialog role: they interrupt to report a problem, not just
      // to inform. SweetAlert2 hardcodes role="dialog" for a non-toast popup with no option to
      // change it, so this is set directly on the rendered element rather than left unconfigurable.
      didOpen: (popup) => {
        popup.setAttribute('role', 'alertdialog');
        activateFocusedButtonOnEnter(popup);
      },
      customClass: {
        popup: popupClass(true),
        title: CLASSES.title,
        htmlContainer: CLASSES.htmlContainer,
        actions: CLASSES.actions,
        confirmButton: confirmClass(true),
      },
    }),
  );
}

export interface ConfirmOptions {
  title: string;
  body: string;
  confirmText: string;
  cancelText?: string;
  /** Use for the product's one irreversible act and for other destructive confirmations. */
  danger?: boolean;
}

async function confirmFn(options: ConfirmOptions): Promise<boolean> {
  const swal = await loadSwal();
  const danger = options.danger ?? false;
  const result = await withPopstateGuard(swal, () =>
    swal.fire({
      title: options.title,
      text: options.body,
      showCancelButton: true,
      // DOM order becomes [cancel, confirm]. Matches the project's existing modal convention (the
      // create-visit modal in VisitsView.tsx): under dir="rtl" with justify-content: flex-end, the
      // cancel button sits toward the row's RTL main-start and the primary action sits against the
      // outer edge — the same mirrored-LTR layout every other modal in the product already uses.
      reverseButtons: true,
      confirmButtonText: options.confirmText,
      cancelButtonText: options.cancelText ?? 'إلغاء',
      buttonsStyling: false,
      allowEscapeKey: true,
      allowOutsideClick: true,
      // A destructive confirmation starts focused on Cancel, not Confirm, so a reflexive Enter
      // press cannot complete the irreversible action by accident.
      focusCancel: danger,
      didOpen: (popup) => {
        popup.setAttribute('role', 'alertdialog');
        activateFocusedButtonOnEnter(popup);
      },
      customClass: {
        popup: popupClass(danger),
        title: CLASSES.title,
        htmlContainer: CLASSES.htmlContainer,
        actions: CLASSES.actions,
        confirmButton: confirmClass(danger),
        cancelButton: CLASSES.cancelButton,
      },
    }),
  );
  return result.isConfirmed === true;
}

export const notify = { info, error, confirm: confirmFn };
