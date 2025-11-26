# BlockVote – Decentralized Election System

[![Deploy to GitHub Pages](https://img.shields.io/badge/frontend-live-green)](https://itzWahaj.github.io/blockchain-voting-dapp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A secure, transparent, and decentralized voting application built on the Polygon blockchain with WebAuthn biometric authentication. BlockVote ensures immutable election results while maintaining voter privacy and preventing fraud.

## 🌟 Features

### Core Functionality
- **Decentralized Voting**: Smart contracts deployed on Polygon Amoy Testnet ensure tamper-proof elections
- **Biometric Authentication**: WebAuthn integration for secure, fingerprint-based voter registration
- **Admin Dashboard**: Complete election management with candidate management, voting session control, and real-time statistics
- **Real-time Results**: Live vote tracking and transparent result display
- **Audit Trail**: Complete on-chain transaction history for verification
- **Multiple Elections**: Factory pattern allows creation of multiple independent election instances

### Security Features
- **One Vote Per Voter**: Blockchain-enforced single vote guarantee
- **Credential Verification**: Unique credential hashing prevents duplicate registrations
- **Immutable Records**: All votes are permanently recorded on-chain
- **Admin Controls**: Secure admin-only functions for election lifecycle management

### User Experience
- **Modern UI**: Beautiful, responsive design with dark/light theme support
- **Smooth Animations**: Enhanced UX with React Spring and Anime.js
- **Mobile Responsive**: Works seamlessly on all device sizes
- **Real-time Updates**: Live event listeners for instant vote updates

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19.1.0
- React Router DOM 7.5.3
- Ethers.js 6.13.7
- Tailwind CSS 3.4.1
- Framer Motion & Anime.js for animations
- WebAuthn API for biometric authentication

**Smart Contracts:**
- Solidity 0.8.18
- Hardhat 2.23.0
- Polygon Amoy Testnet

**Backend:**
- Express.js 5.1.0
- File upload handling with Multer

**Deployment:**
- GitHub Pages (Frontend)
- Polygon Amoy Testnet (Smart Contracts)
