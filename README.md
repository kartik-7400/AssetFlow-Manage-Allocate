# AssetFlow - Smart Asset Management & Resource Allocation Platform

## Overview

AssetFlow is a full-stack asset management platform designed to help organizations efficiently track, manage, and allocate shared resources.

Many institutions still rely on spreadsheets, manual records, and informal communication channels to manage assets. This often leads to resource conflicts, poor visibility, delayed returns, and underutilized inventory.

AssetFlow provides a centralized solution that simplifies inventory management, asset booking, approval workflows, resource allocation, and operational analytics through an intuitive web-based interface.

The platform is inspired by real-world resource management challenges such as those faced by university cultural councils, event management teams, and organizations that frequently share equipment across multiple users and departments.

---

## Problem Statement

Organizations often manage a large pool of shared resources such as:

* DSLR Cameras
* Studio Lighting Equipment
* Audio Systems
* Recording Equipment
* Costumes
* Stage Props
* Event Infrastructure

Managing these resources manually becomes increasingly difficult as the inventory grows.

AssetFlow addresses this challenge by providing:

* Centralized inventory tracking
* Resource booking and allocation
* Approval workflows
* Asset issue and return management
* Utilization monitoring
* Data-driven operational insights

---

## Key Features

### Authentication & Authorization

* OAuth-based authentication
* Secure user registration and login
* Role-based access control
* Protected routes and secure sessions

### Inventory Management

Administrators can:

* Add new assets
* Edit asset information
* Delete assets
* Categorize inventory
* Manage available quantities
* Monitor asset status

Each asset contains:

* Asset Name
* Category
* Description
* Available Quantity
* Status

### Asset Discovery & Booking

Users can:

* Browse available assets
* Search and filter inventory
* Check asset availability
* Request assets for specific durations
* Track booking requests

The system automatically prevents bookings that exceed available inventory.

### Approval Workflow

Administrators can:

* Review booking requests
* Approve requests
* Reject requests
* View active allocations

Users can monitor request status in real time.

### Asset Issue & Return Management

* Asset issuance tracking
* Return management
* Due date monitoring
* Inventory updates
* Status synchronization

### Analytics Dashboard

Interactive dashboards provide insights into:

* Most utilized assets
* Asset utilization rates
* Active bookings
* Available inventory
* Overdue returns

Visualizations include:

* Bar Charts
* Pie Charts
* Line Graphs
* Summary Statistics Cards

### Borrowing History

Users can:

* View current bookings
* Track past requests
* Access borrowing history

Administrators can view organization-wide activity records.

---

## Optional Enhancements

### Notification System

* Booking approval notifications
* Booking rejection notifications
* Return reminders
* Overdue asset alerts

### Audit Logs

Track critical system activities:

* Asset creation
* Inventory updates
* Booking approvals
* Asset returns

### QR Code Asset Tracking

* Generate QR codes for assets
* Scan assets during issue and return
* Instant asset information lookup

### Asset Health Monitoring

Track:

* Asset condition
* Maintenance records
* Damage reports

### Docker Support

* Dockerized development environment
* Docker Compose setup
* Simplified deployment process

---

## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* React Router
* Axios
* Recharts / Chart.js

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose ODM

### Authentication

* OAuth 2.0
* JWT

### Deployment

* Docker
* Docker Compose

---

## System Roles

### User

* Browse assets
* Request bookings
* Track requests
* View borrowing history
* Return allocated assets

### Administrator

* Manage inventory
* Approve or reject bookings
* Issue and receive assets
* Monitor utilization
* Access analytics dashboard

---

## Project Goals

* Improve inventory visibility
* Reduce booking conflicts
* Streamline resource allocation
* Increase asset utilization
* Maintain accountability throughout the asset lifecycle
* Provide actionable operational insights
