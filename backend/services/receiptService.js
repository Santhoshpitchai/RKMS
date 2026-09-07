const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Get available logo file path
 */
const getLogoPath = () => {
  const candidatePaths = [
    path.join(__dirname, '../../RKS Mahila Sangha/src/assets/RKMS Logo.png'),
    path.join(__dirname, '../../RKS Mahila Sangha Admin/src/assets/RKMS-Logo.png'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

/**
 * Convert number to words in Indian Rupees
 */
const amountToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (!num || num === 0) return 'Zero Rupees';
  const n = Math.floor(num);
  let words = '';
  if (n >= 10000000) {
    words += amountToWords(Math.floor(n / 10000000)).replace(' Rupees', '') + ' Crore ';
  }
  const remCrore = n % 10000000;
  if (remCrore >= 100000) {
    words += amountToWords(Math.floor(remCrore / 100000)).replace(' Rupees', '') + ' Lakh ';
  }
  const remLakh = remCrore % 100000;
  if (remLakh >= 1000) {
    words += amountToWords(Math.floor(remLakh / 1000)).replace(' Rupees', '') + ' Thousand ';
  }
  const remThousand = remLakh % 1000;
  if (remThousand >= 100) {
    words += ones[Math.floor(remThousand / 100)] + ' Hundred ';
  }
  const remHundred = remThousand % 100;
  if (remHundred > 0) {
    if (words !== '') words += 'and ';
    if (remHundred < 20) {
      words += ones[remHundred] + ' ';
    } else {
      words += tens[Math.floor(remHundred / 10)] + (remHundred % 10 ? ' ' + ones[remHundred % 10] + ' ' : ' ');
    }
  }
  return words.trim() + ' Rupees Only';
};

/**
 * Generate PDF 80G Tax Exemption Receipt Buffer
 */
const generateDonationReceiptPdf = (receiptData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const {
        receiptNumber = `80G-${Date.now()}`,
        donorName = 'Valued Supporter',
        donorEmail = 'N/A',
        donorPhone = 'N/A',
        panNumber = 'N/A',
        address = 'N/A',
        amount = 1000,
        purpose = 'General Support & Women Welfare',
        paymentId = `PAY_${Date.now()}`,
        orderId = `ORD_${Date.now()}`,
        date = new Date().toISOString().split('T')[0],
      } = receiptData;

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const primaryColor = '#0A6C87';
      const darkColor = '#0F172A';
      const grayColor = '#475569';

      // 1. Page Outer Decorative Border Frame
      doc.lineWidth(1.5).strokeColor(primaryColor).rect(20, 20, pageWidth - 40, pageHeight - 40).stroke();
      doc.lineWidth(0.5).strokeColor('#94A3B8').rect(23, 23, pageWidth - 46, pageHeight - 46).stroke();

      // 2. Top Header Accent Banner
      doc.rect(24, 24, pageWidth - 48, 85).fill('#0A6C87');

      // Logo rendering in header
      const logoPath = getLogoPath();
      if (logoPath) {
        try {
          doc.image(logoPath, 36, 32, { width: 68, height: 68 });
        } catch (e) {
          doc.circle(70, 66, 30).fill('#FFFFFF');
          doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('RKS', 56, 60);
        }
      }

      // Org Header Information
      const headerTextX = logoPath ? 115 : 40;
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('RAJU KSHATRIYA MAHILA SANGHA', headerTextX, 33);

      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#E0F2FE')
         .text('Registered under Karnataka Societies Registration Act, 1960 — Reg No: DRB1/SOR/343/2024-2025', headerTextX, 55);

      doc.fontSize(9.5)
         .font('Helvetica-Bold')
         .fillColor('#FDE047')
         .text('80G Tax Exemption Reg No: 80G/DRB1/SOR/343/2024-2025', headerTextX, 70);

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#F1F5F9')
         .text('No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage, RR Nagar Post, Bengaluru - 560098', headerTextX, 86);

      // 3. Receipt Title Pill
      const titleY = 120;
      doc.roundedRect(40, titleY, pageWidth - 80, 26, 4).fill('#0F172A');
      doc.fillColor('#FFFFFF')
         .fontSize(10.5)
         .font('Helvetica-Bold')
         .text('OFFICIAL DONATION RECEIPT & 80G TAX EXEMPTION CERTIFICATE', 40, titleY + 7, { align: 'center', width: pageWidth - 80 });

      // 4. 80G Statutory Notice Box
      const noticeY = 153;
      doc.roundedRect(40, noticeY, pageWidth - 80, 42, 6).fillAndStroke('#F0F9FF', '#BAE6FD');

      doc.fillColor(primaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('STATUTORY TAX EXEMPTION NOTICE (SECTION 80G)', 52, noticeY + 7);

      doc.fillColor('#334155')
         .fontSize(8)
         .font('Helvetica')
         .text(
           'Donations to Raju Kshatriya Mahila Sangha are eligible for 50% deduction under Section 80G of the Income Tax Act, 1961 vide Order No. 80G/DRB1/SOR/343/2024-2025. This computer-generated receipt serves as official proof for IT returns filing.',
           52,
           noticeY + 20,
           { width: pageWidth - 104 }
         );

      // 5. Receipt & Donor Details Structured Grid Table
      const gridY = 205;
      doc.fillColor(primaryColor)
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('RECEIPT & DONOR INFORMATION', 40, gridY);

      doc.moveTo(40, gridY + 16).lineTo(pageWidth - 40, gridY + 16).lineWidth(1).strokeColor(primaryColor).stroke();

      const gridRows = [
        [
          { label: 'Receipt No:', val: String(receiptNumber) },
          { label: 'Receipt Date:', val: String(date) },
        ],
        [
          { label: 'Donor Name:', val: String(donorName) },
          { label: 'PAN Number:', val: String(panNumber || 'N/A') },
        ],
        [
          { label: 'Email ID:', val: String(donorEmail || 'N/A') },
          { label: 'Phone Number:', val: String(donorPhone || 'N/A') },
        ],
        [
          { label: 'Donor Address:', val: String(address || 'N/A') },
          { label: 'Donation Purpose:', val: String(purpose) },
        ],
        [
          { label: 'Payment Gateway ID:', val: String(paymentId) },
          { label: 'Order Reference ID:', val: String(orderId) },
        ],
        [
          { label: 'Payment Method:', val: 'Online (Razorpay Payment Gateway)' },
          { label: 'Payment Status:', val: 'COMPLETED & VERIFIED ✓' },
        ],
      ];

      let rowY = gridY + 24;
      const col1X = 40;
      const col2X = 310;
      const rowHeight = 24;

      gridRows.forEach((row, idx) => {
        if (idx % 2 === 0) {
          doc.rect(col1X, rowY - 3, pageWidth - 80, rowHeight).fill('#F8FAFC');
        }

        doc.fillColor(grayColor).fontSize(8.5).font('Helvetica-Bold').text(row[0].label, col1X + 8, rowY + 3);
        doc.fillColor(darkColor).fontSize(8.5).font('Helvetica').text(row[0].val, col1X + 105, rowY + 3, { width: 155 });

        if (row[1]) {
          doc.fillColor(grayColor).fontSize(8.5).font('Helvetica-Bold').text(row[1].label, col2X + 8, rowY + 3);
          const isStatus = row[1].label === 'Payment Status:';
          doc.fillColor(isStatus ? '#047857' : darkColor)
             .fontSize(8.5)
             .font(isStatus ? 'Helvetica-Bold' : 'Helvetica')
             .text(row[1].val, col2X + 115, rowY + 3, { width: 150 });
        }

        doc.moveTo(col1X, rowY + rowHeight - 3).lineTo(pageWidth - 40, rowY + rowHeight - 3).lineWidth(0.5).strokeColor('#E2E8F0').stroke();
        rowY += rowHeight;
      });

      // 6. Amount Received Highlight Box
      const amountBoxY = rowY + 12;
      doc.roundedRect(40, amountBoxY, pageWidth - 80, 56, 8).fillAndStroke('#ECFDF5', '#A7F3D0');

      doc.fillColor('#047857')
         .fontSize(9.5)
         .font('Helvetica-Bold')
         .text('TOTAL DONATION AMOUNT RECEIVED', 56, amountBoxY + 10);

      const formattedAmount = `₹ ${Number(amount).toLocaleString('en-IN')}.00`;
      doc.fillColor('#065F46')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text(formattedAmount, 56, amountBoxY + 25);

      const words = amountToWords(Number(amount));
      doc.fillColor('#047857')
         .fontSize(9)
         .font('Helvetica-Oblique')
         .text(`Amount in Words: ${words}`, 230, amountBoxY + 30, { width: pageWidth - 280 });

      // 7. Authorization & Signatures Section
      const sigY = amountBoxY + 80;
      doc.moveTo(40, sigY - 10).lineTo(pageWidth - 40, sigY - 10).lineWidth(1).strokeColor('#E2E8F0').stroke();

      doc.roundedRect(40, sigY, 210, 48, 6).fillAndStroke('#F1F5F9', '#CBD5E1');
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text('VERIFIED & RECORDED', 50, sigY + 8);
      doc.fillColor(grayColor).fontSize(7.5).font('Helvetica').text('Raju Kshatriya Mahila Sangha Audit System\nComputer Generated Document — Valid without signature', 50, sigY + 22, { width: 190 });

      const sigRightX = pageWidth - 230;
      doc.fillColor(darkColor).fontSize(9.5).font('Helvetica-Bold').text('For RAJU KSHATRIYA MAHILA SANGHA', sigRightX, sigY, { align: 'right', width: 190 });
      doc.moveTo(sigRightX + 40, sigY + 34).lineTo(pageWidth - 40, sigY + 34).lineWidth(1).strokeColor(primaryColor).stroke();
      doc.fillColor(primaryColor).fontSize(8.5).font('Helvetica-Bold').text('Authorized Signatory', sigRightX, sigY + 38, { align: 'right', width: 190 });
      doc.fillColor(grayColor).fontSize(7.5).font('Helvetica').text('(Treasurer / Secretary)', sigRightX, sigY + 49, { align: 'right', width: 190 });

      // 8. Footer Section with Complete Address
      const footerY = pageHeight - 65;
      doc.moveTo(40, footerY - 5).lineTo(pageWidth - 40, footerY - 5).lineWidth(1).strokeColor(primaryColor).stroke();

      doc.fillColor(primaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('RAJU KSHATRIYA MAHILA SANGHA (REGD.)', 40, footerY + 2, { align: 'center', width: pageWidth - 80 });

      doc.fillColor(grayColor)
         .fontSize(7.5)
         .font('Helvetica')
         .text(
           'Registered Office: No. 797, "Lakshmi Nilayam", 1st Floor, Banashankari 6th Stage, 1st Block, Parallel to BDA Link Road, Rajarajeshwari Nagar Post, Bangalore – 560 098, Karnataka, India',
           40,
           footerY + 14,
           { align: 'center', width: pageWidth - 80 }
         );

      doc.fillColor(grayColor)
         .fontSize(7.5)
         .font('Helvetica')
         .text(
           'Contact: +91 9972648909  |  Email: rajukshatriyamahilasangha2024@gmail.com  |  Web: www.rajukshatriyamahilasangha.org',
           40,
           footerY + 26,
           { align: 'center', width: pageWidth - 80 }
         );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateDonationReceiptPdf,
};

