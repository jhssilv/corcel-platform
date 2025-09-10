import github_logo from '../assets/github.svg';
import '../styles/footer.css'

// FOOTER COMPONENT \\

function Footer() {
    return (
        <section>
            <a href="https://github.com/jhssilv/corcel-platform" target="_blank" rel="noopener nofererrer">
                <img className="logo" src={github_logo} alt="github logo" />
            </a>
        </section>
    );
  }

export default Footer;