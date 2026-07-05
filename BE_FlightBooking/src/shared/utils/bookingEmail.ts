interface BookingEmailPassenger {
  fullName: string;
  seatNumber: string;
  seatClass: string;
}

export interface BookingConfirmationData {
  bookingCode: string;
  airlineName: string;
  departureAirportCode: string;
  departureAirportCity: string;
  arrivalAirportCode: string;
  arrivalAirportCity: string;
  departureTime: string;
  arrivalTime: string;
  totalAmount: number;
  passengers: BookingEmailPassenger[];
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function buildBookingConfirmationEmail(
  data: BookingConfirmationData
): { subject: string; html: string } {
  const formattedAmount = `${data.totalAmount.toLocaleString('vi-VN')} VND`;

  const passengerRows = data.passengers
    .map(
      (p) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${p.fullName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${p.seatNumber}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-transform:capitalize;">${p.seatClass}</td>
      </tr>`
    )
    .join('');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
    <h2 style="color:#1976d2;">Đặt vé thành công!</h2>
    <p>Cảm ơn bạn đã đặt vé cùng Flight Booking. Dưới đây là thông tin chi tiết chuyến bay của bạn.</p>

    <p style="font-size:15px;"><strong>Mã đặt vé:</strong> ${data.bookingCode}</p>

    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <tr>
        <td style="padding:6px 10px;"><strong>Hãng bay</strong></td>
        <td style="padding:6px 10px;">${data.airlineName}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;"><strong>Chặng bay</strong></td>
        <td style="padding:6px 10px;">${data.departureAirportCity} (${data.departureAirportCode}) &rarr; ${data.arrivalAirportCity} (${data.arrivalAirportCode})</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;"><strong>Khởi hành</strong></td>
        <td style="padding:6px 10px;">${formatDateTime(data.departureTime)}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;"><strong>Hạ cánh</strong></td>
        <td style="padding:6px 10px;">${formatDateTime(data.arrivalTime)}</td>
      </tr>
      <tr>
        <td style="padding:6px 10px;"><strong>Tổng tiền</strong></td>
        <td style="padding:6px 10px;">${formattedAmount}</td>
      </tr>
    </table>

    <h3 style="margin-bottom:6px;">Hành khách</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #1976d2;">Họ tên</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #1976d2;">Ghế</th>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #1976d2;">Hạng</th>
        </tr>
      </thead>
      <tbody>${passengerRows}</tbody>
    </table>

    <p style="margin-top:20px;font-size:13px;color:#777;">
      Nếu bạn không thực hiện giao dịch này, vui lòng liên hệ support@flightbooking.vn ngay.
    </p>
  </div>`;

  return { subject: `Đặt vé thành công - Mã đặt vé ${data.bookingCode}`, html };
}
