export default async function PaymentCancelled({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <main className="paymentResultPage"><section className="confirmationCard"><div className="paymentResultIcon">×</div><span className="sectionLabel">Payment cancelled</span><h2>Your card was not charged.</h2><p>Your basket is still available, so you can return and choose another payment method.</p><a className="checkoutPrimary" href={`/r/${slug}`}>Return to checkout</a></section></main>;
}
