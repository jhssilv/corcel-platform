import githubLogo from '../../assets/github.svg';
import '../../styles/footer.css';

function Footer() {
    return (
        <section>
            <a href="https://github.com/jhssilv/corcel-platform" target="_blank" rel="noopener nofererrer">
                <img className="logo" src={githubLogo} alt="github logo" />
            </a>
        </section>
    );
}

export default Footer;