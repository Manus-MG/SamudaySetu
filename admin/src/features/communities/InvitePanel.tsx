import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, PaperPlaneTilt, WhatsappLogo, X } from '@phosphor-icons/react';
import { errorMessage } from '../../api/errors.ts';
import {
  INVITE_STATUS_LABELS,
  type InviteDto,
  type ListInvitesParams,
  type SentInviteDto,
} from '../../api/types.ts';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard.ts';
import { communitiesApi, communityKeys } from './communities.api.ts';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Spinner } from '../../components/ui/spinner.tsx';

const INVITES_PAGE_SIZE = 8;

/** Mirrors `phoneSchema` on the server, which accepts a bare 10-digit number. */
const isValidIndianMobile = (value: string): boolean => /^[6-9]\d{9}$/.test(value);

interface InvitePanelProps {
  communityId: string;
  onError: (message: string | null) => void;
}

/**
 * Invite one person by phone number.
 *
 * This is the shortest path into a community for the audience that actually
 * exists: nothing to hear correctly, nothing to type, no camera to aim. The
 * leader enters a number they already have and the member taps a link.
 *
 * The catch is visible in the UI rather than hidden: no SMS provider is connected
 * yet, so the link is handed back for the leader to forward on WhatsApp. That is
 * how most of these will travel regardless.
 */
export function InvitePanel({ communityId, onError }: InvitePanelProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { copiedKey, copy } = useCopyToClipboard();

  const [phone, setPhone] = useState('');
  const [lastSent, setLastSent] = useState<SentInviteDto | null>(null);

  const params = useMemo<ListInvitesParams>(() => ({ page: 1, pageSize: INVITES_PAGE_SIZE }), []);

  const invitesQuery = useQuery({
    queryKey: communityKeys.invites(communityId, params),
    queryFn: () => communitiesApi.listInvites(communityId, params),
  });

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: communityKeys.all });
  };

  const sendMutation = useMutation({
    mutationFn: (value: string) => communitiesApi.sendInvite(communityId, value),
    onSuccess: (sent) => {
      setLastSent(sent);
      setPhone('');
      onError(null);
      refresh();
    },
    onError: (error: unknown) => onError(errorMessage(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId: string) => communitiesApi.revokeInvite(communityId, inviteId),
    onSuccess: refresh,
    onError: (error: unknown) => onError(errorMessage(error)),
  });

  const digits = phone.replace(/\D/g, '').slice(-10);
  const canSend = isValidIndianMobile(digits) && !sendMutation.isPending;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Invite someone by phone
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
          They tap one link — no code to read out, nothing to type.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-mono">
            +91
          </span>
          <Input
            inputMode="tel"
            maxLength={14}
            value={phone}
            aria-label="Phone number to invite"
            placeholder="9876543210"
            className="pl-11 h-10 font-mono text-sm"
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSend) sendMutation.mutate(digits);
            }}
          />
        </div>
        <Button
          size="sm"
          className="h-10 text-xs gap-1.5 shrink-0"
          disabled={!canSend}
          onClick={() => sendMutation.mutate(digits)}
        >
          {sendMutation.isPending ? (
            <Spinner className="h-3.5 w-3.5" />
          ) : (
            <PaperPlaneTilt className="h-3.5 w-3.5" />
          )}
          Invite
        </Button>
      </div>

      {phone.length > 0 && !isValidIndianMobile(digits) && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400">
          Enter a 10-digit Indian mobile number.
        </p>
      )}

      {lastSent && <SentInviteCard sent={lastSent} copiedKey={copiedKey} onCopy={copy} />}

      {/* ── Recent invites ───────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        {invitesQuery.isPending && (
          <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
            <Spinner className="h-3 w-3" />
            Loading invites…
          </p>
        )}

        {invitesQuery.isSuccess && invitesQuery.data.items.length === 0 && (
          <p className="text-[11px] text-zinc-400">No invites sent yet.</p>
        )}

        {(invitesQuery.data?.items ?? []).map((invite: InviteDto) => (
          <div
            key={invite.id}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs"
          >
            <span className="font-mono text-zinc-700 dark:text-zinc-300">{invite.phoneMasked}</span>

            <Badge
              variant={
                invite.status === 'ACCEPTED'
                  ? 'active'
                  : invite.status === 'REVOKED'
                    ? 'outline'
                    : invite.isUsable
                      ? 'pending'
                      : 'outline'
              }
              className="text-[10px] px-1.5 py-0"
            >
              {invite.status === 'SENT' && !invite.isUsable
                ? 'Expired'
                : INVITE_STATUS_LABELS[invite.status]}
            </Badge>

            <span className="flex-1" />

            {invite.isUsable && (
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Cancel the invite to ${invite.phoneMasked}`}
                className="h-6 px-1.5 text-[11px] text-zinc-500 hover:text-red-600"
                disabled={revokeMutation.isPending}
                onClick={() => revokeMutation.mutate(invite.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SentInviteCardProps {
  sent: SentInviteDto;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => Promise<boolean>;
}

/**
 * Shown once, right after sending.
 *
 * Leads with the WhatsApp button rather than the raw link: while SMS is not
 * connected, forwarding is not a fallback, it is *the* delivery mechanism, and
 * burying it under a URL would leave leaders thinking the invite already went.
 */
function SentInviteCard({ sent, copiedKey, onCopy }: SentInviteCardProps): React.JSX.Element {
  return (
    <div className="p-2.5 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 space-y-2">
      <p className="text-[11px] text-emerald-900 dark:text-emerald-200">
        {sent.smsDelivered
          ? `Invite sent to ${sent.invite.phoneMasked}.`
          : `Invite created for ${sent.invite.phoneMasked}. SMS is not connected yet — send them the link yourself.`}
      </p>

      <div className="flex items-center gap-2">
        <a
          href={sent.whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
        >
          <WhatsappLogo className="h-4 w-4" weight="fill" />
          Send on WhatsApp
        </a>

        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => void onCopy(sent.inviteUrl, 'invite')}
        >
          {copiedKey === 'invite' ? (
            <>
              <Check className="h-3.5 w-3.5" weight="bold" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
