import Header from './Header'
import Footer from './Footer'

function Layout({ children }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}

export default Layout
