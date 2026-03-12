export async function sendSMS(to: string, message: string) {
  const response = await fetch('https://api.46elks.com/a1/sms', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(
          `${process.env.FORTYSIXELKS_API_USER}:${process.env.FORTYSIXELKS_API_PASSWORD}`
        ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      from: 'EasyPartner',
      to,
      message,
    }),
  });
  return response.json();
}
