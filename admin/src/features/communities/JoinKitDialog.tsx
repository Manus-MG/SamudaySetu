import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  Copy,
  DownloadSimple,
  QrCode,
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import type { JoinKitDto } from '../../api/types.ts';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.ts';
import { communitiesApi, communityKeys } from './communities.api.ts';
import { InvitePanel } from './InvitePanel.tsx';
import { JoinCodeEditor } from './JoinCodeEditor.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx';

interface JoinKitDialogProps {
  communityId: string | null;
  communityName: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Everything a leader needs to get people in, ordered by how well each option
 * works for an elderly member — easiest first, not most technical first.
 *
 *   1. **Invite by phone.** Nothing to hear, nothing to type. One tap.
 *   2. **WhatsApp the link.** One tap, and it is the channel they already use.
 *   3. **The QR.** For a poster or a notice board.
 *   4. **The code**, spoken or typed. The fallback, which is why it is made of
 *      words a person can actually repeat.
 *
 * The raw deep link and share text sit at the bottom, because they are for the
 * leader's own tooling rather than for a member.
 */
export function JoinKitDialog({
  communityId,
  communityName,
  onOpenChange,
}: JoinKitDialogProps): React.JSX.Element {
  const { copiedKey, copy } = useCopyToClipboard();
  const [actionError, setActionError] = useState<string | null>(null);

  const kitQuery = useQuery({
    queryKey: communityKeys.joinKit(communityId ?? ''),
    queryFn: () => communitiesApi.joinKit(communityId ?? ''),
    enabled: communityId !== null,
    // The code is rotatable, so a cached kit can point at a code that no longer
    // works — exactly the failure rotation exists to prevent.
    staleTime: 0,
  });

  const kit = kitQuery.data;

  return (
    <Dialog
      open={communityId !== null}
      onOpenChange={(open) => {
        if (!open) setActionError(null);
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" weight="bold" />
            How people join {communityName}
          </DialogTitle>
          <DialogDescription>
            Anyone holding the code, link or QR can join. Change the code the moment it reaches
            somewhere it should not have.
          </DialogDescription>
        </DialogHeader>

        {kitQuery.isPending && (
          <div className="flex items-center justify-center gap-2 py-16 text-xs text-zinc-500">
            <Spinner />
            <span>Loading…</span>
          </div>
        )}

        {kitQuery.isError && (
          <div
            role="alert"
            className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs"
          >
            {errorMessage(kitQuery.error)}
          </div>
        )}

        {kit && (
          <div className="space-y-5 py-1">
            {actionError && (
              <div
                role="alert"
                className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs flex items-start gap-2"
              >
                <WarningCircle className="h-4 w-4 shrink-0 mt-px" />
                <span>{actionError}</span>
              </div>
            )}

            {/* 1 — the easiest path for the member */}
            <Section step={1} title="Easiest: invite them directly">
              <InvitePanel communityId={kit.communityId} onError={setActionError} />
            </Section>

            {/* 2 — one tap, on the channel they already use */}
            <Section step={2} title="Share the link on WhatsApp">
              <div className="flex items-center gap-2">
                <a
                  href={kit.whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                >
                  <WhatsappLogo className="h-4 w-4" weight="fill" />
                  Open WhatsApp
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs gap-1.5"
                  onClick={() => void copy(kit.joinUrl, 'url')}
                >
                  {copiedKey === 'url' ? (
                    <>
                      <Check className="h-3.5 w-3.5" weight="bold" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy link
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1.5 truncate">
                {kit.joinUrl}
              </p>
            </Section>

            {/* 3 — for the notice board */}
            <Section step={3} title="Print the QR for a notice board">
              <QrPanel kit={kit} />
            </Section>

            {/* 4 — the spoken fallback */}
            <Section step={4} title="Or read out the code">
              <JoinCodeEditor kit={kit} onError={setActionError} />
            </Section>

            <details className="text-xs">
              <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-[11px]">
                Message text and app deep link
              </summary>
              <div className="mt-2 space-y-2">
                <CopyRow
                  label="WhatsApp message"
                  value={kit.shareMessage}
                  fieldKey="share"
                  multiline
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
                <CopyRow
                  label="App deep link"
                  value={kit.deepLink}
                  fieldKey="deep"
                  copiedKey={copiedKey}
                  onCopy={copy}
                />
              </div>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] text-white dark:bg-zinc-100 dark:text-zinc-900">
          {step}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * The QR, from the data URL already in the response — no second request, and no
 * flash of empty space where the image will be.
 */
function QrPanel({ kit }: { kit: JoinKitDto }): React.JSX.Element {
  const download = (): void => {
    const link = document.createElement('a');
    link.href = kit.qrDataUrl;
    link.download = `${kit.joinCode}-join-qr.svg`;
    link.click();
  };

  return (
    <div className="flex items-center gap-4 p-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
      <img
        src={kit.qrDataUrl}
        alt={`QR code to join ${kit.communityName}`}
        width={116}
        height={116}
        className="rounded bg-white shrink-0"
      />
      <div className="min-w-0 space-y-2">
        <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Scanning it opens the app for anyone who has it, and the join page for everyone else.
          Print the code underneath as well — not everyone will manage a scan.
        </p>
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1.5" onClick={download}>
          <DownloadSimple className="h-3.5 w-3.5" />
          Download SVG
        </Button>
      </div>
    </div>
  );
}

interface CopyRowProps {
  label: string;
  value: string;
  fieldKey: string;
  multiline?: boolean;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => Promise<boolean>;
}

function CopyRow({
  label,
  value,
  fieldKey,
  multiline,
  copiedKey,
  onCopy,
}: CopyRowProps): React.JSX.Element {
  const isCopied = copiedKey === fieldKey;

  return (
    <div className="flex items-start gap-2 p-2 rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</div>
        <div
          className={`text-xs text-zinc-900 dark:text-zinc-100 ${
            multiline ? 'whitespace-pre-line' : 'truncate font-mono'
          }`}
          title={multiline ? undefined : value}
        >
          {value}
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        aria-label={`Copy ${label}`}
        className="h-7 px-2 text-xs shrink-0"
        onClick={() => void onCopy(value, fieldKey)}
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" weight="bold" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
