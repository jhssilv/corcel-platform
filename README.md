# **EssayCorrectorMVP**

An MVP for an essay correction platform designed for Brazilian Portuguese texts. This project aims to automate the detection and suggestion of corrections for researchers, leveraging a pre-existing corpus of texts with their grades. This platform is aimed towards making gold standard error-tagging more user-friendly and faster.

## **Key Features**:
- **Corpus Integration**: Works with a pre-existing dataset of graded essays with correction candidates for each unknown token.
- **User-Friendly Interface**: A responsive web interface built with **React** for seamless user interaction.
- **Backend API**: Powered by **Flask** for handling requests and processing corrections.
- **Database**: Utilizes **Postgres** for storing essays, grades, and correction data.
- **Deployment**: Containerized with **Docker** and served via **Nginx** for scalability and ease of deployment.

## **Use Case**:
This platform is designed for researchers and educators working with Brazilian Portuguese texts, providing an efficient way to analyze and improve written content.

_User authentication page_
![Login page](images/userauth.png)

_Main application page_
![Main page](images/mainpage.png)


---

## Disclaimer
This version of the project is not executable as it does not include the database, which contained sensitive data and could not be made public. The repository is primarily intended to showcase the user interface and core functionality of the platform. For a fully functional version, a database setup would be required.