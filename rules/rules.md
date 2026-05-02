# CountyPay — IBM Bob Rules
# Hackathon: IBM Dev Day | Project 14
---

## About Me
I am a full-stack developer with experience in Java, React, Python.
I have limited experience with Blockchain,Hyperledger Fabric, LangChain4j.
This is a hackathon project. I am the team lead of the project focusing on the backend and blockchain aspect.
Prioritise working code over perfection.

## Project Context
We are building CountyPay — a unified county revenue collection platform for Kenyan
county governments. Payments are processed via M-Pesa (Safaricom Daraja API) and USSD
(Africa's Talking), recorded on Hyperledger Fabric blockchain (Kaleido), reconciled 
by an AI agent, and displayed on a React dashboard. The backend is built with Node.js 
and Express.js, with PostgreSQL as the primary database managed through Prisma ORM. 
The frontend is built with React and Vite, styled with TailwindCSS, and communicates 
with the backend via Axios. Authentication is handled using JWT. The USSD layer is 
powered by the Africa's Talking USSD Gateway.

## My Role on This Project
I own the Hyperledger Fabric ledger and Quarkus REST API gateway.


## Behaviour Rules
1. Use MCP server tools whenever available, especially for file system operations.
2. When you finish implementing something, always add or update tests for it.
3. Run existing tests after any code change to ensure nothing is broken.
4. When creating a plan, DO NOT start implementing it right away.
   Always write the plan to a markdown file and wait for me to review and approve it.
5. Keep code changes focused and minimal — only modify what is needed for the task.
6. Always explain what you are about to do before doing it.
7. If you are uncertain about something, ask me first rather than guessing.
8. Prefer clear, readable code over clever one-liners — this is a demo project.
9. When generating Quarkus code, use constructor injection not field injection.
10. All API endpoints must include basic error handling and return meaningful HTTP codes.
