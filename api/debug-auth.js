// Debug endpoint to see what's being compared
export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.NOTIFICATION_SECRET_KEY;
  
  return res.status(200).json({
    receivedHeader: authHeader,
    expectedToken: expectedToken,
    expectedTokenLength: expectedToken?.length,
    match: authHeader === `Bearer ${expectedToken}`,
    // Show first/last chars to debug quotes
    expectedFirstChar: expectedToken?.charCodeAt(0),
    expectedLastChar: expectedToken?.charCodeAt(expectedToken?.length - 1),
    // ASCII 34 = double quote "
    hasQuotesAtStart: expectedToken?.charCodeAt(0) === 34,
    hasQuotesAtEnd: expectedToken?.charCodeAt(expectedToken?.length - 1) === 34
  });
}
