import Header from './Header'
import Footer from './Footer'
import NewsletterPopup from '../NewsletterPopup'

function Layout({ children }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {/*
        Mounted here rather than at the app root so the invitation only reaches the public
        marketing pages. Interrupting a customer mid-way through booking a task, or a worker
        managing their jobs, would be an intrusion rather than an offer.
      */}
      <NewsletterPopup />
    </>
  )
}

export default Layout
