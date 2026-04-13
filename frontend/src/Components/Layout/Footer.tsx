import githubLogo from "../../assets/github.svg";
import styles from "./footer.module.css";

function Footer() {
	return (
		<section>
			<a
				href="https://github.com/jhssilv/corcel-platform"
				target="_blank"
				rel="noopener nofererrer"
			>
				<img className={styles.logo} src={githubLogo} alt="github logo" />
			</a>
		</section>
	);
}

export default Footer;
