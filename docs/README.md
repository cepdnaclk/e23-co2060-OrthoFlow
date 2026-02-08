---
layout: home
permalink: index.html

# Please update this with your repository name and project title
repository-name: e23-co2060-OrthoFlow
title: Digitisation and Workflow Automation of Orthodontic Case Records
---

[comment]: # "This is the standard layout for the project, but you can clean this and use your own template, and add more information required for your own project"

<!-- Once you fill the index.json file inside /docs/data, please make sure the syntax is correct. (You can use this tool to identify syntax errors)

Please include the "correct" email address of your supervisors. (You can find them from https://people.ce.pdn.ac.lk/ )

Please include an appropriate cover page image ( cover_page.jpg ) and a thumbnail image ( thumbnail.jpg ) in the same folder as the index.json (i.e., /docs/data ). The cover page image must be cropped to 940×352 and the thumbnail image must be cropped to 640×360 . Use https://croppola.com/ for cropping and https://squoosh.app/ to reduce the file size.

If your followed all the given instructions correctly, your repository will be automatically added to the department's project web site (Update daily)

A HTML template integrated with the given GitHub repository templates, based on github.com/cepdnaclk/eYY-project-theme . If you like to remove this default theme and make your own web page, you can remove the file, docs/_config.yml and create the site using HTML. -->

# Project Title

---

## Team
-  E/23/214, G.N.N.N.Madusanka, [email](e23214@eng.pdn.ac.lk)
-  E/23/407, S.A.A.Upek, [email](e23407@eng.pdn.ac.lk)
-  E/23/403, D.J.Thotagamuwa, [email](e23403@eng.pdn.ac.lk)
-  E/23/054, M.V.R.Dayananda, [email](e23054@eng.pdn.ac.lk)

<!-- Image (photo/drawing of the final hardware) should be here -->

<!-- This is a sample image, to show how to add images to your page. To learn more options, please refer [this](https://projects.ce.pdn.ac.lk/docs/faq/how-to-add-an-image/) -->

<!-- ![Sample Image](./images/sample.png) -->

#### Table of Contents
1. [Introduction](#introduction)
2. [Solution Architecture](#solution-architecture )
3. [Software Designs](#hardware-and-software-designs)
4. [Testing](#testing)
5. [Conclusion](#conclusion)
6. [Links](#links)

## Introduction

Orthodontic diagnosis and treatment planning depend on structured clinical records including patient histories, diagnostic indices, radiographs, photographs, and progress documentation. In many academic and public healthcare settings, these records are maintained through paper-based or fragmented digital systems, resulting in inefficiencies, inconsistent data handling, and difficulty in longitudinal patient tracking.

This project proposes the development of **OrthoFlow**, a secure web-based system designed to digitise orthodontic case records and automate clinical workflows. The system supports structured electronic patient records, integration of digitised radiographs, historical treatment tracking, and automated appointment reminders through messaging services.

By aligning software engineering practices with real clinical workflows, the project aims to improve data accessibility, clinical decision support, and operational efficiency, while providing a scalable foundation for future healthcare innovations.


## Solution Architecture

The system follows a layered client–server architecture:

### Presentation Layer
- Web-based interface accessible through browsers
- Supports clinicians and administrative staff
- Provides patient record forms, radiograph viewing, scheduling, and login

### Application Layer
- Backend server managing system logic
- Authentication and role-based access
- Record management modules
- History tracking
- Notification scheduling

### Data & Service Layer
- Relational database storing patient and clinical data
- Media storage for radiographs and attachments
- SMS API integration for reminders

This modular structure ensures scalability, maintainability, and secure data handling.

## Software Designs

### Functional Components
- Patient record digitisation and management
- Radiograph upload and retrieval
- Treatment history timeline tracking
- Appointment scheduling system
- SMS reminder service
- Role-based user management

### Non-Functional Considerations
- Security through authentication and encrypted communication
- High usability and intuitive UI design
- Reliable data storage with backup strategies
- Scalable architecture for future expansion
- Maintainable modular codebase

### Technology Stack (Proposed)
- Frontend: React / Angular
- Backend: Node.js / Django
- Database: PostgreSQL / MySQL
- Messaging Integration: SMS Gateway API
- Deployment: Cloud/Docker environment

## Testing

### Unit Testing
- Verification of individual modules
- Form validation checks
- API response testing

### Integration Testing
- Backend–database communication
- Media upload functionality
- Messaging service interaction

### User Acceptance Testing
- Workflow evaluation with intended users
- Interface usability checks
- Functional verification of scheduling and record tracking

### Summary
Testing ensures system reliability, data integrity, and usability before deployment.

---

## Conclusion

This project demonstrates the application of software engineering principles to address real-world healthcare challenges. By digitising orthodontic case records and automating workflows, the system improves accessibility, accuracy, and clinical efficiency.

Future enhancements may include:
- AI-assisted diagnosis support
- Analytics-based treatment outcome evaluation
- Integration with hospital information systems
- Mobile application extensions

The developed platform serves as both a practical healthcare solution and an academic exploration of secure medical software development.

---

## Links

- [Project Repository](https://github.com/cepdnaclk/{{ page.repository-name }}){:target="_blank"}
- [Project Page](https://cepdnaclk.github.io/{{ page.repository-name}}){:target="_blank"}
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- [University of Peradeniya](https://eng.pdn.ac.lk/)

[//]: # (Please refer this to learn more about Markdown syntax)
[//]: # (https://github.com/adam-p/markdown-here/wiki/Markdown-Cheatsheet)









