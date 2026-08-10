import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowsClockwise,
  Check,
  Copy,
  DownloadSimple,
  QrCode,
  WarningCircle,
} from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import type { JoinKitDto } from '../../api/types.ts';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.ts';
import { communitiesApi, communityKeys } from './communities.api.ts';
import { Button } from '../../components/ui/button.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx';

interface JoinKitDialogProps {
  communityId: string | null;
  communityName: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * The share sheet for a community: code, link, deep link and QR, each
 * individually copyable.
 *
 * All four are rendered together rather than behind tabs because they are used
 * together — a leader printing a poster wants the QR *and* the code on it, and a
 * WhatsApp broadcast wants the link *and* the code, since forwarded messages
 * routinely lose their link preview.
 */
export function JoinKitDialog({
  communityId,
  communityName,
  onOpenChange,
}: JoinKitDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { copiedKey, copy } = useCopyToClipboard();
  const [isConfirmingRotate, setIsConfirmingRotate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const kitQuery = useQuery({
    queryKey: communityKeys.joinKit(communityId ?? ''),
    queryFn: () => communitiesApi.joinKit(communityId ?? ''),
    // The QR is a live view of a rotatable secret; a stale one is worse than a spinner.
    enabled: communityId !== null,
    staleTime: 0,
  });

  const rotateMutation = useMutation({
    mutationFn: () => communitiesApi.rotateJoinCode(communityId ?? ''),
    onSuccess: (kit) => {
      setIsConfirmingRotate(false);
      setActionError(null);
      queryClient.setQueryData(communityKeys.joinKit(kit.communityId), kit);
      // The code is denormalised onto the community row too.
      void queryClient.invalidateQueries({ queryKey: communityKeys.all });
    },
    onError: (error: unknown) => setActionError(errorMessage(error)),
  });

  const kit = kitQuery.data;

  const handleClose = (open: boolean): void => {
    if (!open) {
      setIsConfirmingRotate(false);
      setActionError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={communityId !== null} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-4 w-4" weight="bold" />
            Join kit
          </DialogTitle>
          <DialogDescription>
            Anyone with this code, link or QR can join {communityName}. Rotate it the moment it
            reaches somewhere it should not have.
          </DialogDescription>
        </DialogHeader>

        {kitQuery.isPending && (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-zinc-500">
            <Spinner />
            <span>Loading join kit…</span>
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
          <div className="space-y-4 py-1">
            {actionError && (
              <div
                role="alert"
                className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs flex items-start gap-2"
              >
                <WarningCircle className="h-4 w-4 shrink-0 mt-px" />
                <span>{actionError}</span>
              </div>
            )}

            <QrPanel kit={kit} />

            <div className="space-y-2">
              <CopyRow
                label="Join code"
                value={kit.joinCodeFormatted}
                copyValue={kit.joinCode}
                fieldKey="code"
                mono
                copiedKey={copiedKey}
                onCopy={copy}
              />
              <CopyRow
                label="Join link"
                value={kit.joinUrl}
                fieldKey="url"
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
              <CopyRow
                label="WhatsApp message"
                value={kit.shareMessage}
                fieldKey="share"
                multiline
                copiedKey={copiedKey}
                onCopy={copy}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {isConfirmingRotate ? (
            <>
              <span className="flex-1 text-[11px] text-amber-700 dark:text-amber-400 self-center text-left">
                The current code stops working immediately. Existing members stay.
              </span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setIsConfirmingRotate(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs gap-1.5"
                disabled={rotateMutation.isPending}
                onClick={() => rotateMutation.mutate()}
              >
                {rotateMutation.isPending ? (
                  <Spinner className="h-3.5 w-3.5" />
                ) : (
                  <ArrowsClockwise className="h-3.5 w-3.5" />
                )}
                Rotate code
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              disabled={!kit}
              onClick={() => setIsConfirmingRotate(true)}
            >
              <ArrowsClockwise className="h-3.5 w-3.5" />
              Rotate code
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/**
 * The QR with a download affordance.
 *
 * The image is the server-rendered data URL rather than a fetch of the `.svg`
 * endpoint: it is already in the response, so it paints with no second request
 * and no flash of empty space.
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
        width={132}
        height={132}
        className="rounded bg-white shrink-0"
      />
      <div className="min-w-0 space-y-2">
        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Print this on a notice board or a pamphlet. Scanning it opens the app for anyone who
          already has it installed, and the join page for everyone else.
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
  /** What the user sees. */
  value: string;
  /** What lands on the clipboard, when it differs — e.g. the ungrouped code. */
  copyValue?: string;
  fieldKey: string;
  mono?: boolean;
  multiline?: boolean;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => Promise<boolean>;
}

function CopyRow({
  label,
  value,
  copyValue,
  fieldKey,
  mono,
  multiline,
  copiedKey,
  onCopy,
}: CopyRowProps): React.JSX.Element {
  const isCopied = copiedKey === fieldKey;

  return (
    <div className="flex items-start gap-2 p-2 rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          {label}
        </div>
        <div
          className={`text-xs text-zinc-900 dark:text-zinc-100 ${mono ? 'font-mono tracking-wider text-sm' : ''} ${
            multiline ? 'whitespace-pre-line' : 'truncate'
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
        onClick={() => void onCopy(copyValue ?? value, fieldKey)}
      >
        {isCopied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" weight="bold" />
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">Copied</span>
          </>
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
