const PDFDocument = require('pdfkit');

/**
 * Generate PDF 80G Tax Exemption Receipt Buffer
 */
const generateDonationReceiptPdf = (receiptData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const {
        receiptNumber = `REC-${Date.now()}`,
        donorName = 'Valued Donor',
        donorEmail = '',
        donorPhone = '',
        amount = 1000,
        purpose = 'General Support & Women Welfare',
        paymentId = `PAY_${Date.now()}`,
        orderId = `ORD_${Date.now()}`,
        date = new Date().toISOString().split('T')[0],
      } = receiptData;

      // Primary Colors
      const primaryColor = '#0A6C87';
      const secondaryColor = '#0891b2';
      const darkColor = '#1e293b';

      // Header Banner
      doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);

      // Title in Banner
      doc.fillColor('#FFFFFF')
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('Raju Kshatriya Mahila Sangha', 40, 25);

      doc.fontSize(10)
         .font('Helvetica')
         .text('Registered under Society Act (DRB1/SOR/343/2024-2025) • Bengaluru, Karnataka', 40, 50);

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('OFFICIAL DONATION RECEIPT & 80G TAX EXEMPTION CERTIFICATE', 40, 70);

      // Reset text position
      doc.fillColor(darkColor).y = 120;

      // 80G Exemption Box
      doc.roundedRect(40, 115, doc.page.width - 80, 45, 6)
         .fillAndStroke('#f0f9ff', '#bae6fd');

      doc.fillColor(primaryColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('TAX EXEMPTION NOTICE (SECTION 80G)', 50, 123);

      doc.fillColor('#334155')
         .fontSize(8.5)
         .font('Helvetica')
         .text('Donations to Raju Kshatriya Mahila Sangha are exempt from Income Tax under Section 80G of the Income Tax Act, 1961. Reg No: 80G/DRB1/SOR/343/2024-2025.', 50, 138);

      // Receipt Summary Grid
      const startY = 175;

      doc.fillColor(primaryColor)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('Receipt & Payment Details', 40, startY);

      doc.moveTo(40, startY + 18).lineTo(doc.page.width - 40, startY + 18).stroke('#e2e8f0');

      const details = [
        { label: 'Receipt Number:', value: String(receiptNumber) },
        { label: 'Date:', value: String(date) },
        { label: 'Donor Name:', value: String(donorName) },
        { label: 'Donor Email:', value: String(donorEmail || 'N/A') },
        { label: 'Donor Phone:', value: String(donorPhone || 'N/A') },
        { label: 'Donation Purpose:', value: String(purpose) },
        { label: 'Payment ID (Razorpay):', value: String(paymentId) },
        { label: 'Order Reference ID:', value: String(orderId) },
      ];

      let currentY = startY + 30;
      details.forEach((item) => {
        doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold').text(item.label, 50, currentY);
        doc.fillColor(darkColor).fontSize(9).font('Helvetica').text(item.value, 200, currentY);
        currentY += 20;
      });

      // Amount Highlight Box
      currentY += 10;
      doc.roundedRect(40, currentY, doc.page.width - 80, 50, 8)
         .fillAndStroke('#ecfdf5', '#a7f3d0');

      doc.fillColor('#047857')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('Total Amount Received:', 60, currentY + 12);

      doc.fillColor('#065f46')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text(`₹ ${Number(amount).toLocaleString('en-IN')}.00`, 60, currentY + 26);

      doc.fillColor('#047857')
         .fontSize(9)
         .font('Helvetica-Oblique')
         .text('Status: COMPLETED (Verified via Razorpay)', 300, currentY + 26);

      // Authorization & Seal Section
      currentY += 80;
      doc.moveTo(40, currentY).lineTo(doc.page.width - 40, currentY).stroke('#e2e8f0');

      currentY += 20;
      doc.fillColor(darkColor)
         .fontSize(9)
         .font('Helvetica-Bold')
         .text('For Raju Kshatriya Mahila Sangha', 40, currentY);

      doc.fontSize(8)
         .font('Helvetica')
         .text('This is a computer-generated official 80G tax exemption receipt and does not require a physical signature.', 40, currentY + 15);

      // Footer
      doc.fontSize(8)
         .fillColor('#94a3b8')
         .text('Raju Kshatriya Mahila Sangha • Bengaluru, Karnataka • Contact: support@rajukshatriyamahilasangha.com', 40, doc.page.height - 35, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateDonationReceiptPdf,
};
