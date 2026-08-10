import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { errorMessage } from '../../api/errors.ts';
import type { CommunityDto } from '../../api/types.ts';
import { communitiesApi } from './communities.api.ts';
import { Button } from '../../components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog.tsx';

const MIN_REASON_LENGTH = 3;

interface RejectCommunityDialogProps {
  community: CommunityDto | null;
  onOpenChange: (open: boolean) => void;
  onRejected: () => void;
}

/**
 * Rejection is the one moderation action that needs an explanation, so it gets a
 * dialog rather than a one-click button.
 *
 * The reason is stored on the community and shown to the leader — it is the only
 * thing telling them what to fix before proposing again.
 */
export function RejectCommunityDialog({
  community,
  onOpenChange,
  onRejected,
}: RejectCommunityDialogProps): React.JSX.Element {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      communitiesApi.moderate(input.id, 'REJECT', input.reason),
    onSuccess: () => {
      setReason('');
      setError(null);
      onRejected();
      onOpenChange(false);
    },
    onError: (caught: unknown) => setError(errorMessage(caught)),
  });

  const trimmed = reason.trim();

  return (
    <Dialog
      open={community !== null}
      onOpenChange={(next) => {
        if (!next) {
          setReason('');
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject this community?</DialogTitle>
          <DialogDescription>
            {community?.name} will be closed permanently and its leader freed to propose a new one.
            This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {error && (
            <div
              role="alert"
              className="p-2.5 rounded bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/60 dark:border-red-900 dark:text-red-300 text-xs"
            >
              {error}
            </div>
          )}

          <label
            htmlFor="reject-reason"
            className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Reason (shown to the leader)
          </label>
          <textarea
            id="reject-reason"
            rows={3}
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Duplicate of an existing community; name does not match the registered trust; …"
            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-xs text-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            disabled={mutation.isPending || trimmed.length < MIN_REASON_LENGTH || !community}
            onClick={() => {
              if (community) mutation.mutate({ id: community.id, reason: trimmed });
            }}
          >
            {mutation.isPending ? 'Rejecting…' : 'Reject community'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
