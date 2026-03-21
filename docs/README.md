---
layout: home
permalink: index.html

repository-name: e23-co2060-OrthoFlow
title: Digitisation and Workflow Automation of Orthodontic Case Records
---

# Project Title

Digitisation and Workflow Automation of Orthodontic Case Records is a web-based system designed to streamline orthodontic clinical workflows. It captures structured patient records, diagnostic data, media such as radiographs and photographs, and treatment progress, while enabling automated messaging for appointments. The system bridges software engineering and healthcare digital transformation, allowing accurate, longitudinal tracking of patient outcomes and improving diagnostic consistency.

---

## Team
- E/23/403, D.J. Thotagamuwa, e23403@eng.pdn.ac.lk
- E/23/407, S.A.A. Upek, e23407@eng.pdn.ac.lk
- E/23/214, G.N.N.N. Madusanka, e23214@eng.pdn.ac.lk)

#### Table of Contents
1. [Introduction](#introduction)
2. [Solution Architecture](#solution-architecture)
3. [Software Designs](#software-designs)
4. [Testing](#testing)
5. [Conclusion](#conclusion)
6. [Links](#links)

## Introduction

Orthodontic diagnosis and treatment planning rely on the systematic collection and longitudinal tracking of clinical data, including patient history, diagnostic indices, photographs, radiographs, and treatment records. Traditional paper-based or fragmented digital systems lead to inefficiencies, data inconsistency, and challenges in patient follow-up.  

This project addresses these issues by digitalising patient records, integrating radiographs, enabling history tracing, and implementing automated messaging for appointments. It aims to improve clinical decision-making, support audits and research, and lay a foundation for AI-assisted diagnosis.

---

## Solution Architecture

The system is developed using **Spring Boot** (backend), **React** (frontend), and **PostgreSQL** (database). Key components:

- **Frontend:** Form-driven UI with conditional logic and media management.
- **Backend:** REST APIs with secure, role-based access and timeline-based treatment tracking.
- **Database:** Structured schema to capture patient records, diagnostics, and clinical media.
- **Messaging Service:** SMS/email notifications for patient appointments.


---

## Software Designs

- Modular, maintainable architecture with separate layers for UI, API, and data persistence.
- Conditional forms for treatment workflows.
- Media management for photos and radiographs.
- Audit-friendly data model supporting longitudinal tracking.
- Role-based access to ensure data security.

---

## Testing

- Functional testing of data entry forms, media uploads, and patient history tracing.
- Security testing for role-based access.
- Integration testing of messaging service and database operations.
- Summarized results: Successful end-to-end workflow from patient intake to treatment completion.

---

## Conclusion

This project successfully digitalised orthodontic clinical workflows, providing accurate, structured patient records, media integration, history tracing, and automated messaging. Future developments may include analytics dashboards, AI-assisted diagnosis, and broader deployment in public healthcare settings.

---

## Links

- [Project Repository](https://github.com/cepdnaclk/eYY-co2060-project-template){:target="_blank"}
- [Project Page](https://cepdnaclk.github.io/eYY-co2060-project-template){:target="_blank"}
- [Department of Computer Engineering](http://www.ce.pdn.ac.lk/)
- [University of Peradeniya](https://eng.pdn.ac.lk/)
