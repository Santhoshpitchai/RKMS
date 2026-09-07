import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Ticket, CreditCard, CheckCircle2, Download, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { eventsApi, paymentApi } from '../services/api';
import rkmsLogo from '../assets/RKMS Logo.png';

interface EventData {
  id: number;
  title: string;
  date: string;
  location: string;
  description: string;
  price: number;
  is_free: boolean;
  imageUrl?: string;
  image_url?: string;
}

interface EventRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventData | null;
  userSession?: { name?: string; email?: string; phone?: string } | null;
  existingRegistration?: any;
  onSuccess?: (newRegObj?: any) => void;
  onCancelRegistration?: (regDbId: number) => void;
}

interface SuccessData {
  dbId?: number;
  registrationId: string;
  eventTitle: string;
  name: string;
  email: string;
  numberOfAttendees: number;
  totalAmount: number;
  isFree: boolean;
  date: string;
  location: string;
}

export const formatDateSafe = (dateVal: any, options?: Intl.DateTimeFormatOptions) => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('en-IN', options || { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return String(dateVal);
  }
};

export const formatCurrencySafe = (amount: any) => {
  const num = Number(amount || 0);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

function SuccessTicket({ data, onClose, onCancel }: { data: SuccessData; onClose: () => void; onCancel?: () => void }) {
  const handleDownloadTicket = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Please allow popups to download your ticket'); return; }
    const totalAmtStr = formatCurrencySafe(data.totalAmount);
    const issueDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // Convert RKMS logo to base64 so it works in the isolated print window
    let logoBase64 = '';
    try {
      const resp = await fetch(rkmsLogo);
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      // fallback: no logo
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <title>RKMS – Event Entry Ticket | ${data.registrationId}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4; margin: 0; }
          body {
            font-family: 'Inter', sans-serif;
            background: #f0f4f8;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 40px 20px;
            color: #1a202c;
          }

          /* ── TICKET WRAPPER ── */
          .ticket-wrapper {
            width: 680px;
            max-width: 100%;
            background: white;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08);
          }

          /* ── HEADER ── */
          .ticket-header {
            background: linear-gradient(135deg, #0A5C74 0%, #0A6C87 45%, #0891b2 100%);
            padding: 28px 32px 20px;
            position: relative;
            overflow: hidden;
          }
          .ticket-header::before {
            content: '';
            position: absolute; top: -60px; right: -60px;
            width: 200px; height: 200px;
            background: rgba(255,255,255,0.06);
            border-radius: 50%;
          }
          .ticket-header::after {
            content: '';
            position: absolute; bottom: -40px; left: 120px;
            width: 140px; height: 140px;
            background: rgba(255,255,255,0.04);
            border-radius: 50%;
          }
          .header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 18px;
          }
          .org-brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .org-logo-circle {
            width: 52px; height: 52px;
            background: rgba(255,255,255,0.15);
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 22px;
            flex-shrink: 0;
          }
          .org-name { color: white; }
          .org-name h1 { font-size: 15px; font-weight: 800; line-height: 1.2; letter-spacing: -0.3px; }
          .org-name p { font-size: 10px; color: rgba(255,255,255,0.7); font-weight: 500; margin-top: 2px; }
          .ticket-badge {
            background: ${data.isFree ? 'rgba(52,211,153,0.25)' : 'rgba(229,193,0,0.25)'};
            border: 1.5px solid ${data.isFree ? 'rgba(52,211,153,0.6)' : 'rgba(229,193,0,0.6)'};
            color: ${data.isFree ? '#a7f3d0' : '#fde68a'};
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .event-info { position: relative; z-index: 1; }
          .event-title {
            color: white;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.5px;
            line-height: 1.25;
            margin-bottom: 10px;
          }
          .event-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
          }
          .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            color: rgba(255,255,255,0.8);
            font-weight: 500;
          }
          .meta-icon { font-size: 13px; }

          /* ── TEAR LINE ── */
          .tear-line {
            display: flex;
            align-items: center;
            background: #f0f4f8;
            position: relative;
          }
          .tear-circle {
            width: 28px; height: 28px;
            background: #f0f4f8;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .tear-circle.left { margin-left: -14px; }
          .tear-circle.right { margin-right: -14px; }
          .tear-dashes {
            flex: 1;
            border-top: 2.5px dashed #cbd5e1;
            margin: 0 4px;
          }

          /* ── BODY ── */
          .ticket-body {
            padding: 28px 32px;
          }

          /* Registration ID section */
          .reg-id-section {
            background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
            border: 1.5px solid #6ee7b7;
            border-radius: 16px;
            padding: 18px 20px;
            text-align: center;
            margin-bottom: 24px;
            position: relative;
            overflow: hidden;
          }
          .reg-id-section::before {
            content: '✓';
            position: absolute; top: -4px; right: 16px;
            font-size: 60px; color: #d1fae5; font-weight: 900;
            line-height: 1;
          }
          .reg-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #065f46;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .reg-id-value {
            font-family: 'Space Mono', monospace;
            font-size: 26px;
            font-weight: 700;
            color: #064e3b;
            letter-spacing: 2px;
          }
          .reg-issued {
            font-size: 9px;
            color: #6b7280;
            margin-top: 6px;
          }

          /* Details grid */
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            border: 1.5px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            margin-bottom: 20px;
          }
          .detail-cell {
            padding: 14px 18px;
            border-bottom: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
          }
          .detail-cell:nth-child(even) { border-right: none; }
          .detail-cell:nth-last-child(-n+2) { border-bottom: none; }
          .detail-cell.full-width {
            grid-column: 1 / -1;
            border-right: none;
          }
          .detail-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #94a3b8;
            font-weight: 600;
            margin-bottom: 4px;
          }
          .detail-value {
            font-size: 13px;
            font-weight: 700;
            color: #1e293b;
          }
          .amount-badge {
            display: inline-block;
            background: ${data.isFree ? '#d1fae5' : '#dbeafe'};
            color: ${data.isFree ? '#065f46' : '#1e40af'};
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 800;
          }

          /* Attendee limit notice */
          .limit-notice {
            background: #fff7ed;
            border: 1.5px solid #fed7aa;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            align-items: flex-start;
          }
          .limit-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
          .limit-text { font-size: 11px; color: #9a3412; font-weight: 600; line-height: 1.5; }

          /* ── TEAR LINE 2 (before ToC) ── */

          /* ── TERMS & CONDITIONS ── */
          .toc-section {
            background: #f8fafc;
            border-top: 1.5px dashed #cbd5e1;
            padding: 22px 32px;
          }
          .toc-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #475569;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .toc-title::before, .toc-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #cbd5e1;
          }
          .toc-list {
            list-style: none;
          }
          .toc-item {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
            align-items: flex-start;
          }
          .toc-num {
            flex-shrink: 0;
            width: 20px; height: 20px;
            background: #0A6C87;
            color: white;
            border-radius: 50%;
            font-size: 9px;
            font-weight: 800;
            display: flex; align-items: center; justify-content: center;
            margin-top: 1px;
          }
          .toc-text {
            font-size: 10.5px;
            color: #475569;
            line-height: 1.6;
          }
          .toc-text strong { color: #1e293b; font-weight: 700; }

          /* ── FOOTER ── */
          .ticket-footer {
            background: linear-gradient(135deg, #0A5C74, #0A6C87);
            padding: 16px 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .footer-left {
            color: rgba(255,255,255,0.85);
            font-size: 10px;
            line-height: 1.6;
          }
          .footer-left strong { color: white; font-size: 11px; display: block; margin-bottom: 1px; }
          .footer-right {
            text-align: right;
            color: rgba(255,255,255,0.7);
            font-size: 9px;
          }
          .footer-right .valid-for {
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.25);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 4px;
            display: inline-block;
          }

          @media print {
            body { background: white; padding: 0; justify-content: flex-start; }
            .ticket-wrapper { box-shadow: none; border-radius: 0; width: 100%; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="ticket-wrapper">

          <!-- HEADER -->
          <div class="ticket-header">
            <div class="header-top">
              <div class="org-brand">
                <div class="org-logo-circle">
                  ${logoBase64 ? `<img src="${logoBase64}" alt="RKMS Logo" style="width:44px;height:44px;object-fit:contain;border-radius:50%;" />` : '<span style="font-size:22px">🏛️</span>'}
                </div>
                <div class="org-name">
                  <h1>Raju Kshatriya Mahila Sangha</h1>
                  <p>Banashankari, Bengaluru – Official Event Ticket</p>
                </div>
              </div>
              <div class="ticket-badge">${data.isFree ? '🎟 FREE ENTRY' : '🎫 PAID EVENT'}</div>
            </div>
            <div class="event-info">
              <div class="event-title">${data.eventTitle || 'RKMS Event'}</div>
              <div class="event-meta">
                <span class="meta-item"><span class="meta-icon">📅</span> ${data.date || 'Date TBD'}</span>
                ${data.location ? `<span class="meta-item"><span class="meta-icon">📍</span> ${data.location}</span>` : ''}
                <span class="meta-item"><span class="meta-icon">👥</span> ${data.numberOfAttendees} Attendee(s)</span>
              </div>
            </div>
          </div>

          <!-- TEAR LINE -->
          <div class="tear-line">
            <div class="tear-circle left"></div>
            <div class="tear-dashes"></div>
            <div class="tear-circle right"></div>
          </div>

          <!-- BODY -->
          <div class="ticket-body">

            <!-- Registration ID -->
            <div class="reg-id-section">
              <div class="reg-label">🎟 Registration Confirmation ID</div>
              <div class="reg-id-value">${data.registrationId}</div>
              <div class="reg-issued">Issued on ${issueDate} &nbsp;•&nbsp; Present this ticket at entry</div>
            </div>

            <!-- Details Grid -->
            <div class="details-grid">
              <div class="detail-cell">
                <div class="detail-label">👤 Registrant Name</div>
                <div class="detail-value">${data.name}</div>
              </div>
              <div class="detail-cell">
                <div class="detail-label">✉️ Email Address</div>
                <div class="detail-value" style="font-size:11px;">${data.email}</div>
              </div>
              <div class="detail-cell">
                <div class="detail-label">👥 No. of Persons</div>
                <div class="detail-value">${data.numberOfAttendees} Person(s)</div>
              </div>
              <div class="detail-cell">
                <div class="detail-label">💳 Amount Paid</div>
                <div class="detail-value">
                  <span class="amount-badge">${data.isFree ? 'FREE ENTRY' : '₹' + totalAmtStr}</span>
                </div>
              </div>
              ${data.location ? `
              <div class="detail-cell full-width">
                <div class="detail-label">📍 Venue / Location</div>
                <div class="detail-value">${data.location}</div>
              </div>` : ''}
            </div>

            <!-- Attendee Limit Notice -->
            <div class="limit-notice">
              <span class="limit-icon">⚠️</span>
              <div class="limit-text">
                <strong>Strictly ${data.numberOfAttendees} Attendee(s) Authorised.</strong>
                Only the registered number of persons will be permitted entry. No additional guests can be accommodated beyond the registered count. Please carry a valid ID proof and this ticket to the venue.
              </div>
            </div>

          </div>

          <!-- TERMS & CONDITIONS -->
          <div class="toc-section">
            <div class="toc-title">Terms &amp; Conditions</div>
            <ul class="toc-list">
              <li class="toc-item">
                <div class="toc-num">1</div>
                <div class="toc-text">
                  <strong>Event Cancellation / Postponement by Organiser:</strong> If the event is cancelled or postponed by Raju Kshatriya Mahila Sangha, any amount paid by the attendee will be fully refunded to the original payment source within <strong>5–7 business days</strong>. In case of postponement, the registration may optionally be transferred to the rescheduled date at the attendee's discretion.
                </div>
              </li>
              <li class="toc-item">
                <div class="toc-num">2</div>
                <div class="toc-text">
                  <strong>Attendee Cancellation / Unable to Attend:</strong> If you are unable to attend the event, please write to <strong>rksmahilasangha@gmail.com</strong> with your Registration ID and reason. Cancellation requests will be reviewed and responded to within <strong>5–7 business days</strong>. Refunds (if applicable) are subject to the organiser's cancellation policy and the timing of the request.
                </div>
              </li>
              <li class="toc-item">
                <div class="toc-num">3</div>
                <div class="toc-text">
                  <strong>Entry Verification:</strong> This ticket must be presented at the venue entrance for verification — either as a <strong>digital screen copy or a printed hard copy</strong>. Your RKMS Membership Card (soft copy or hard copy) may also be requested for identity verification. Entry will be denied without a valid ticket.
                </div>
              </li>
              <li class="toc-item">
                <div class="toc-num">4</div>
                <div class="toc-text">
                  <strong>Attendee Limit is Strictly Enforced:</strong> Only <strong>${data.numberOfAttendees} person(s)</strong> are authorised under this registration. No additional walk-in guests can be accommodated beyond the registered count, regardless of availability. Please ensure all attending members are listed at the time of registration.
                </div>
              </li>
              <li class="toc-item">
                <div class="toc-num">5</div>
                <div class="toc-text">
                  <strong>Membership Requirement:</strong> Attendance at RKMS events is reserved for active members and their immediate family. The primary registrant must hold a valid RKMS membership. Membership status may be verified at the venue.
                </div>
              </li>
            </ul>
          </div>

          <!-- FOOTER -->
          <div class="ticket-footer">
            <div class="footer-left">
              <strong>Raju Kshatriya Mahila Sangha</strong>
              Banashankari, Bengaluru, Karnataka<br/>
              rksmahilasangha@gmail.com
            </div>
            <div class="footer-right">
              <div class="valid-for">✓ Valid for ${data.numberOfAttendees} Person(s)</div>
              <div>Ticket ID: ${data.registrationId}</div>
              <div>Issued: ${issueDate}</div>
            </div>
          </div>

        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="overflow-hidden">
      {/* RKMS Org Header Strip */}
      <div className="bg-gradient-to-r from-[#0A5C74] to-[#0A6C87] px-5 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/15 border border-white/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img src={rkmsLogo} alt="RKMS" className="w-8 h-8 object-contain rounded-full" />
        </div>
        <div>
          <p className="text-white font-extrabold text-xs leading-tight tracking-tight">Raju Kshatriya Mahila Sangha</p>
          <p className="text-cyan-200 text-[9px] font-medium">Official Event Ticket • Bengaluru</p>
        </div>
        <div className="ml-auto">
          <span className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${
            data.isFree ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40' : 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
          }`}>
            {data.isFree ? '🎟 Free Entry' : '🎫 Paid Event'}
          </span>
        </div>
      </div>

      {/* Premium Success Banner */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative z-10">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-white/40">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-extrabold tracking-tight">Registration Confirmed!</h3>
          <p className="text-emerald-100 text-xs mt-1">
            {data.isFree ? '🎟 Free entry secured' : '✅ Payment received'} for{' '}
            <span className="font-bold text-white">{data.numberOfAttendees} person(s)</span>
          </p>
        </div>
      </div>

      {/* Ticket tear-line separator */}
      <div className="flex items-center bg-gray-50 relative">
        <div className="w-5 h-5 bg-white rounded-full -ml-2.5 flex-shrink-0 border border-gray-200" />
        <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-1" />
        <div className="w-5 h-5 bg-white rounded-full -mr-2.5 flex-shrink-0 border border-gray-200" />
      </div>

      <div className="p-5 space-y-4 bg-white">
        {/* Registration ID */}
        <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-600 rounded-2xl p-4 text-white text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
          <div className="flex items-center justify-center gap-1.5 text-cyan-200 text-[10px] font-semibold uppercase tracking-widest mb-1.5">
            <Hash className="w-3 h-3" /> Registration ID
          </div>
          <p className="text-[22px] font-extrabold font-mono tracking-widest leading-none">{data.registrationId}</p>
          <p className="text-[9px] text-cyan-200 mt-2 font-medium uppercase tracking-wide">
            📲 Screenshot or print this ticket • Show at entrance
          </p>
        </div>

        {/* Event Details Grid */}
        <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
          <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
            <div className="p-3">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Ticket className="w-3 h-3" /> Event
              </p>
              <p className="font-bold text-gray-900 leading-tight">{data.eventTitle || 'RKMS Event'}</p>
            </div>
            <div className="p-3">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Date
              </p>
              <p className="font-bold text-gray-900">{data.date || '-'}</p>
            </div>
            {data.location && (
              <div className="p-3 col-span-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Venue
                </p>
                <p className="font-bold text-gray-900">{data.location}</p>
              </div>
            )}
            <div className="p-3 border-t border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Attendees</p>
              <p className="font-extrabold text-gray-900">{data.numberOfAttendees} Person(s)</p>
            </div>
            <div className="p-3 border-t border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount Paid</p>
              <p className={`font-extrabold text-sm ${data.isFree ? 'text-emerald-600' : 'text-[#0A6C87]'}`}>
                {data.isFree ? '₹0 (FREE)' : `₹${formatCurrencySafe(data.totalAmount)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Attendee Limit Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 items-start">
          <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
          <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
            <strong>Entry strictly for {data.numberOfAttendees} registered person(s) only.</strong> No walk-in guests beyond the registered count will be allowed. Bring this ticket + valid ID proof to the venue.
          </p>
        </div>

        {/* Terms & Conditions Summary */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-[10px] font-bold text-gray-500 uppercase tracking-wider px-1 list-none">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 bg-[#0A6C87] text-white rounded-full flex items-center justify-center text-[8px]">✦</span>
              Terms &amp; Conditions
            </span>
            <span className="text-[8px] text-gray-400 font-normal normal-case group-open:hidden">Tap to read</span>
            <span className="text-[8px] text-gray-400 font-normal normal-case hidden group-open:inline">Tap to collapse</span>
          </summary>
          <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
            {[
              { n: 1, title: 'Event Cancellation/Postponement', body: 'If the event is cancelled or postponed by RKMS, paid amounts will be fully refunded within 5–7 business days, or transferred to the rescheduled date.' },
              { n: 2, title: 'Attendee Cancellation', body: 'To cancel, email rksmahilasangha@gmail.com with your Registration ID. Requests are reviewed within 5–7 business days.' },
              { n: 3, title: 'Entrance Verification', body: 'Present this ticket (digital or printed) at the venue. Your RKMS Membership Card may also be requested for identity verification.' },
              { n: 4, title: 'Strict Attendee Limit', body: `Only ${data.numberOfAttendees} authorised person(s) under this registration. No additional walk-ins allowed regardless of availability.` },
              { n: 5, title: 'Membership Requirement', body: 'Events are reserved for active RKMS members and immediate family. Membership status may be verified at the venue.' },
            ].map((t) => (
              <div key={t.n} className="flex gap-2 items-start text-[10px]">
                <span className="w-4 h-4 bg-[#0A6C87] text-white rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-0.5">{t.n}</span>
                <div>
                  <span className="font-bold text-gray-800">{t.title}: </span>
                  <span className="text-gray-600">{t.body}</span>
                </div>
              </div>
            ))}
          </div>
        </details>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleDownloadTicket}
            className="w-full bg-gradient-to-r from-[#0A6C87] to-cyan-600 text-white py-3 rounded-xl font-bold text-xs hover:from-[#085a70] hover:to-cyan-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-200"
          >
            <Download className="w-4 h-4" />
            View &amp; Download Ticket (PDF)
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 text-rose-600 bg-rose-50 hover:bg-rose-100 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 border border-rose-200"
              >
                Cancel Registration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventRegistrationModal({
  isOpen,
  onClose,
  event,
  userSession,
  existingRegistration,
  onSuccess,
  onCancelRegistration
}: EventRegistrationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    numberOfAttendees: 1,
    guestNames: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  useEffect(() => {
    if (userSession) {
      setFormData((prev) => ({
        ...prev,
        name: userSession.name || prev.name,
        email: userSession.email || prev.email,
        phone: userSession.phone || prev.phone,
      }));
    }
  }, [userSession, isOpen]);

  useEffect(() => {
    if (isOpen && existingRegistration) {
      setSuccessData({
        dbId: existingRegistration.id,
        registrationId: existingRegistration.registrationId || `REG-${existingRegistration.id}`,
        eventTitle: existingRegistration.eventTitle || event?.title || 'RKS Event',
        name: existingRegistration.name || userSession?.name || 'Member',
        email: existingRegistration.email || userSession?.email || '',
        numberOfAttendees: existingRegistration.numberOfAttendees || 1,
        totalAmount: Number(existingRegistration.paymentAmount || 0),
        isFree: existingRegistration.isFree ?? Number(existingRegistration.paymentAmount || 0) === 0,
        date: existingRegistration.eventDate ? formatDateSafe(existingRegistration.eventDate, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : (event ? formatDateSafe(event.date) : '-'),
        location: existingRegistration.eventLocation || event?.location || '',
      });
    } else if (!isOpen) {
      setSuccessData(null);
    }
  }, [isOpen, existingRegistration, event, userSession]);

  if (!isOpen || !event) return null;

  const pricePerPerson = Number(event.price || 0);
  const isFree = event.is_free || pricePerPerson === 0;
  const totalAmount = isFree ? 0 : pricePerPerson * formData.numberOfAttendees;

  const buildSuccessData = (res: any): SuccessData => ({
    dbId: res.dbId,
    registrationId: res.registrationId || `REG-${Date.now()}`,
    eventTitle: event.title || 'RKS Event',
    name: formData.name,
    email: formData.email,
    numberOfAttendees: formData.numberOfAttendees,
    totalAmount: res.totalAmount ?? totalAmount,
    isFree: res.isFree ?? isFree,
    date: formatDateSafe(event.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    location: event.location || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in your Name, Email, and Phone number');
      return;
    }

    setIsLoading(true);

    try {
      if (isFree) {
        // FREE EVENT: Direct Registration
        const res = await eventsApi.registerEvent(event.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          numberOfAttendees: formData.numberOfAttendees,
          guestNames: formData.guestNames,
          paymentStatus: 'completed',
          paymentAmount: 0,
        });

        if (res.success) {
          toast.success('Registration confirmed!');
          const succData = buildSuccessData(res);
          const newRegObj = {
            id: res.dbId || Date.now(),
            eventId: event.id,
            event_id: event.id,
            registrationId: succData.registrationId,
            eventTitle: event.title,
            eventDate: event.date,
            eventLocation: event.location,
            numberOfAttendees: formData.numberOfAttendees,
            guestNames: formData.guestNames,
            name: formData.name,
            email: formData.email,
            paymentAmount: succData.totalAmount,
            paymentStatus: 'completed',
            isFree: succData.isFree,
            date: formatDateSafe(new Date(), { day: '2-digit', month: 'short', year: 'numeric' }),
          };
          if (onSuccess) onSuccess(newRegObj);
          setSuccessData(succData);
        } else {
          toast.error(res.message || 'Registration failed');
        }
      } else {
        // PAID EVENT: Razorpay Payment Flow
        const orderRes = await eventsApi.createOrder(event.id, {
          numberOfAttendees: formData.numberOfAttendees,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });

        if (orderRes.success && orderRes.order && orderRes.razorpayKeyId) {
          if (typeof (window as any).Razorpay === 'undefined') {
            toast.error('Razorpay SDK is not loaded. Please refresh the page and try again.');
            setIsLoading(false);
            return;
          }

          const options = {
            key: orderRes.razorpayKeyId,
            amount: orderRes.order.amount,
            currency: 'INR',
            name: 'RKS Mahila Sangha',
            description: `Event Entry: ${event.title} (${formData.numberOfAttendees} Ticket(s))`,
            order_id: orderRes.order.id,
            callback_url: window.location.href,
            handler: async function (rzpRes: any) {
              const regRes = await eventsApi.registerEvent(event.id, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                numberOfAttendees: formData.numberOfAttendees,
                guestNames: formData.guestNames,
                paymentStatus: 'completed',
                paymentAmount: totalAmount,
                paymentId: rzpRes.razorpay_payment_id,
              });

              if (regRes.success) {
                toast.success('Payment verified! Registration confirmed.');
                const succData = buildSuccessData(regRes);
                const newRegObj = {
                  id: regRes.dbId || Date.now(),
                  eventId: event.id,
                  event_id: event.id,
                  registrationId: succData.registrationId,
                  eventTitle: event.title,
                  eventDate: event.date,
                  eventLocation: event.location,
                  numberOfAttendees: formData.numberOfAttendees,
                  guestNames: formData.guestNames,
                  name: formData.name,
                  email: formData.email,
                  paymentAmount: succData.totalAmount,
                  paymentStatus: 'completed',
                  isFree: succData.isFree,
                  date: formatDateSafe(new Date(), { day: '2-digit', month: 'short', year: 'numeric' }),
                };
                if (onSuccess) onSuccess(newRegObj);
                setSuccessData(succData);
              } else {
                toast.error(regRes.message || 'Registration failed after payment verification');
              }
            },
            modal: {
              ondismiss: function () {
                paymentApi.cancelOrder(orderRes.order.id, 'User cancelled event ticket checkout');
                toast.info('Event ticket payment was cancelled.');
              },
            },
            prefill: {
              name: formData.name,
              email: formData.email,
              contact: formData.phone,
            },
            theme: { color: '#0A6C87' },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', (resp: any) => {
            toast.error(resp?.error?.description || 'Event payment was declined or failed.');
          });
          rzp.open();
        } else {
          toast.error(orderRes.message || 'Failed to create event payment order');
        }
      }
    } catch (err) {
      console.error('Event registration error:', err);
      toast.error('An error occurred during event registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 max-h-[95vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
              isFree ? 'bg-emerald-400 text-emerald-950' : 'bg-[#E5C100] text-[#0A6C87]'
            }`}>
              {isFree ? 'FREE ENTRY EVENT' : `PAID EVENT • ₹${pricePerPerson} / Person`}
            </span>
          </div>

          <h3 className="text-xl font-bold leading-snug">{event.title}</h3>
          
          <div className="flex flex-wrap gap-4 text-xs text-cyan-100 mt-2">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateSafe(event.date, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {event.location}</span>}
          </div>
        </div>

        {/* Content: either form or success ticket */}
        {successData ? (
          <SuccessTicket
            data={successData}
            onClose={onClose}
            onCancel={successData.dbId && onCancelRegistration ? () => onCancelRegistration(successData.dbId!) : undefined}
          />
        ) : (
          /* Registration Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Registrant Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Enter full name"
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="Enter email"
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="Enter phone"
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Number of Attendees *</span>
                  <span className="text-[10px] text-gray-500 font-normal">Including yourself and family</span>
                </label>
                <select
                  value={formData.numberOfAttendees}
                  onChange={(e) => setFormData({ ...formData, numberOfAttendees: parseInt(e.target.value) })}
                  className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none bg-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Person' : 'People / Family Members'}
                    </option>
                  ))}
                </select>
              </div>

              {formData.numberOfAttendees > 1 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Accompanying Guest Names (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.guestNames}
                    onChange={(e) => setFormData({ ...formData, guestNames: e.target.value })}
                    placeholder="e.g. Santhosh, Priya, Rahul"
                    className="w-full px-3.5 py-2.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0A6C87] outline-none"
                  />
                </div>
              )}
            </div>

            {/* Pricing Summary Box */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 font-medium">Ticket Type</span>
                <span className="font-bold text-gray-900">{isFree ? 'Free Admission' : `₹${pricePerPerson} × ${formData.numberOfAttendees} Person(s)`}</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-200">
                <span className="font-bold text-gray-900">Total Payable Amount</span>
                <span className={`font-extrabold text-base ${isFree ? 'text-emerald-600' : 'text-[#0A6C87]'}`}>
                  {isFree ? '₹0 (FREE)' : `₹${formatCurrencySafe(totalAmount)}`}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                isFree
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-[#E5C100] hover:bg-[#CCA900] text-[#0A6C87]'
              }`}
            >
              {isFree ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {isLoading ? 'Processing Registration...' : 'Complete Free Event Registration'}
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  {isLoading ? 'Opening Razorpay...' : `Proceed to Pay ₹${formatCurrencySafe(totalAmount)} via Razorpay`}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
