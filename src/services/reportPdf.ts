import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { endOfDay, format, startOfDay } from 'date-fns';
import { listCompletedOrdersInRange } from '../db/orders';
import { listMediaForOrder } from '../db/mediaItems';
import { getDispatcherContact } from '../db/settings';
import type { MediaItem, Order } from '../types/models';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusBadgeHtml(order: Order): string {
  if (order.status === 'completed') {
    return `<span class="badge badge-completed">Completed</span>`;
  }
  const today = format(new Date(), 'yyyy-MM-dd');
  if (order.dueDate && order.dueDate < today) {
    return `<span class="badge badge-overdue">Overdue</span>`;
  }
  return `<span class="badge badge-in-process">In Process</span>`;
}

async function photoToDataUri(item: MediaItem): Promise<string | null> {
  try {
    const file = new File(item.filePath);
    if (!file.exists) return null;
    const base64 = await file.base64();
    const mime = item.filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

const SHARED_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; color: #14161C; }
  .header { background: linear-gradient(135deg, #4FC3F7, #7C4DFF); color: #ffffff; padding: 28px 36px; }
  .header .brand { font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; opacity: 0.85; }
  .header h1 { margin: 6px 0 0; font-size: 24px; font-weight: 800; }
  .header .subtitle { margin-top: 6px; font-size: 14px; opacity: 0.92; }
  .content { padding: 28px 36px; }
  .job-section { padding-top: 8px; }
  .job-section-break { page-break-before: always; }
  .job-header-row { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; }
  .job-header-row h2 { margin: 0; font-size: 18px; font-weight: 800; }
  .job-project { font-size: 13px; color: #6E6D74; margin-bottom: 14px; }
  .meta-grid { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .meta-item { min-width: 140px; }
  .meta-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6E6D74; margin-bottom: 3px; }
  .meta-value { font-size: 14px; font-weight: 600; color: #14161C; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .badge-in-process { background: #FCF0D9; color: #B4740E; }
  .badge-completed { background: #DCF3E1; color: #188A54; }
  .badge-overdue { background: #FBE7E7; color: #C53434; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #6E6D74; margin: 22px 0 10px; border-top: 1px solid #E6E8EF; padding-top: 16px; }
  .notes-box { background: #F6F7FB; border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.5; color: #14161C; white-space: pre-wrap; }
  .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .photo-grid img { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #E6E8EF; }
  .empty-note { font-size: 13px; color: #9C9BA3; }
  .video-list { font-size: 12px; color: #6E6D74; line-height: 1.6; }
  .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #E6E8EF; font-size: 10px; color: #9C9BA3; }
`;

function jobMetaItems(order: Order): { label: string; value: string }[] {
  return [
    { label: 'Client', value: order.clientName || '—' },
    {
      label: 'Due Date',
      value: order.dueDate ? format(new Date(`${order.dueDate}T00:00:00`), 'MMM d, yyyy') : 'No due date',
    },
    { label: 'Opened', value: format(new Date(order.createdAt), 'MMM d, yyyy') },
    ...(order.completedAt ? [{ label: 'Completed', value: format(new Date(order.completedAt), 'MMM d, yyyy') }] : []),
  ];
}

async function buildJobSectionHtml(
  order: Order,
  media: MediaItem[],
  opts: { pageBreakBefore: boolean }
): Promise<string> {
  const photos = media.filter((m) => m.type === 'photo');
  const videos = media.filter((m) => m.type === 'video');

  const photoDataUris = await Promise.all(photos.map(photoToDataUri));
  const photoTags = photoDataUris
    .filter((uri): uri is string => uri !== null)
    .map((uri) => `<img src="${uri}" />`)
    .join('');

  const metaItems = jobMetaItems(order);

  return `<div class="job-section${opts.pageBreakBefore ? ' job-section-break' : ''}">
    <div class="job-header-row">
      <h2>${escapeHtml(order.ceNumber)}</h2>
      ${statusBadgeHtml(order)}
    </div>
    <div class="job-project">${escapeHtml(order.projectName || 'No project name on file')}</div>
    <div class="meta-grid">
      ${metaItems
        .map(
          (item) =>
            `<div class="meta-item"><div class="meta-label">${item.label}</div><div class="meta-value">${escapeHtml(item.value)}</div></div>`
        )
        .join('')}
    </div>
    ${order.notes ? `<div class="section-title">Notes</div><div class="notes-box">${escapeHtml(order.notes)}</div>` : ''}
    <div class="section-title">Photos (${photos.length})</div>
    ${photoTags ? `<div class="photo-grid">${photoTags}</div>` : '<div class="empty-note">No photos captured for this job.</div>'}
    ${
      videos.length > 0
        ? `<div class="section-title">Videos (${videos.length})</div><div class="video-list">${videos
            .map((v) => escapeHtml(v.fileName))
            .join('<br/>')}<br/>Available on device — not embedded in this PDF.</div>`
        : ''
    }
  </div>`;
}

async function buildReportHtml(order: Order, media: MediaItem[]): Promise<string> {
  const section = await buildJobSectionHtml(order, media, { pageBreakBefore: false });
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="brand">Blueprint Digital &middot; BPD Capture</div>
    <h1>Field Report &mdash; ${escapeHtml(order.ceNumber)}</h1>
    <div class="subtitle">${escapeHtml(order.projectName || 'No project name on file')}</div>
  </div>
  <div class="content">
    ${section}
    <div class="footer">Generated by BPD Capture on ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}</div>
  </div>
</body>
</html>`;
}

async function buildDigestHtml(orders: Order[], mediaByOrder: MediaItem[][]): Promise<string> {
  const sections = await Promise.all(
    orders.map((order, i) => buildJobSectionHtml(order, mediaByOrder[i], { pageBreakBefore: i > 0 }))
  );
  const dayLabel = format(new Date(), 'MMM d, yyyy');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="brand">Blueprint Digital &middot; BPD Capture</div>
    <h1>Daily Digest &mdash; ${dayLabel}</h1>
    <div class="subtitle">${orders.length} job${orders.length === 1 ? '' : 's'} completed today</div>
  </div>
  <div class="content">
    ${sections.join('')}
    <div class="footer">Generated by BPD Capture on ${format(new Date(), "MMM d, yyyy 'at' h:mm a")}</div>
  </div>
</body>
</html>`;
}

/**
 * Emails the PDF straight to the saved dispatcher (attachment + recipient
 * pre-filled, no share-sheet chooser) when possible; falls back to the
 * standard Android share sheet when no dispatcher email is saved, or the
 * device has no mail app configured.
 */
async function deliverPdf(uri: string, opts: { dialogTitle: string; subject: string; body: string }): Promise<void> {
  const dispatcher = await getDispatcherContact();

  if (dispatcher.email) {
    const mailAvailable = await MailComposer.isAvailableAsync();
    if (mailAvailable) {
      await MailComposer.composeAsync({
        recipients: [dispatcher.email],
        subject: opts.subject,
        body: opts.body,
        attachments: [uri],
      });
      return;
    }
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: opts.dialogTitle,
  });
}

export async function exportAndShareJobReport(order: Order, media: MediaItem[]): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Field report export requires on-device file access and only works in the installed app.');
  }

  const html = await buildReportHtml(order, media);
  const { uri } = await Print.printToFileAsync({ html });

  await deliverPdf(uri, {
    dialogTitle: `Share field report — ${order.ceNumber}`,
    subject: `Field Report — ${order.ceNumber}`,
    body: `Attached is the field report for ${order.ceNumber}${order.clientName ? ` (${order.clientName})` : ''}.`,
  });
}

export async function exportAndShareDailyDigest(): Promise<{ jobCount: number }> {
  if (Platform.OS === 'web') {
    throw new Error('Daily digest export requires on-device file access and only works in the installed app.');
  }

  const now = new Date();
  const orders = await listCompletedOrdersInRange(startOfDay(now).toISOString(), endOfDay(now).toISOString());
  if (orders.length === 0) {
    throw new Error('No jobs have been completed today yet.');
  }

  const mediaByOrder = await Promise.all(orders.map((order) => listMediaForOrder(order.id)));
  const html = await buildDigestHtml(orders, mediaByOrder);
  const { uri } = await Print.printToFileAsync({ html });

  const dayLabel = format(now, 'MMM d, yyyy');
  await deliverPdf(uri, {
    dialogTitle: `Share daily digest — ${dayLabel}`,
    subject: `Daily Digest — ${dayLabel} (${orders.length} job${orders.length === 1 ? '' : 's'})`,
    body: `Attached is the daily digest of ${orders.length} completed job${orders.length === 1 ? '' : 's'} for ${dayLabel}.`,
  });

  return { jobCount: orders.length };
}
