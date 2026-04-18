'use client';

import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

interface RitualTreeProps {
    userId: string;
    wallet: number; 
    score: number; // Indispensable pour la réinitialisation
  }
// 1. TES COORDONNÉES EXACTES
const TREE_DATA = {
    trunk: `M146.44,809.65c3.01-13.66,2.67-27.7.38-41.46-1.17-6.82-2.23-13.81-4.25-20.44-5.85-20.55-20.93-36.11-31.23-54.48-7.18-12.56-9.62-27.16-11.49-41.36-5.16-42.69,5.81-84.95,15.15-126.25,1.25-5.96,4.24-14.58,6.02-20.47,10.36-33.53,23.39-66.46,31.45-100.59,6.47-27.09,7.23-55.14,1.84-82.47-9.47-48.16-30.35-93.26-50.51-137.76,0,0-8.94-19.14-8.94-19.14,0,0,3.15-1.59,3.15-1.59,26.37,49.86,52.32,101.37,63.34,157.18,5.45,28.1,4.55,57.54-2.23,85.31-8.28,34.48-21.43,67.28-32,101-1.76,5.79-4.73,14.21-5.99,20.05-9.54,40.57-20.86,82.16-16.19,124.13.76,6.91,1.94,13.78,3.41,20.59,5.9,27.79,30.67,47.05,37.82,74.77,1.99,6.89,2.94,13.92,4.05,20.99,2.16,14.06,2.16,28.67-1.18,42.57,0,0-2.62-.59-2.62-.59h0Z M125.85,808.08c22.68-19.86,16.82-54.11,6.21-78.97-3.77-8.86-8.36-17.47-14.03-25.19-4.4-6.94-9.15-13.66-14.28-20.09-44.27-54.33-86.88-61.19-83.39-144.12-1.03,35.78,6.12,64.56,32.38,90.12,11.68,11.71,24.57,22.17,36.3,33.88,11.86,11.67,22.54,24.57,31.64,38.52,5.6,7.32,10.8,16.64,14.69,25.45,9.66,22.27,15.96,49.75,3.4,72.24-2.54,4.44-5.83,8.46-9.61,11.9l-3.32-3.73h0Z M112.58,810.62c6.51-6.91,11.74-15.03,15.07-23.91,3.39-8.86,4.95-18.4,4.93-27.96,0-9.56-1.51-19.14-4.07-28.43-2.58-9.28-6.14-18.33-10.64-26.86l3.67-1.96c4.71,8.79,8.44,18.06,11.18,27.64,2.72,9.58,4.36,19.54,4.45,29.59.09,10.04-1.48,20.18-5.03,29.67-3.49,9.51-9.03,18.24-15.9,25.64l-3.66-3.42Z M169.86,775.86c-8.51-36.83-21.96-72.55-40.43-105.55-11.07-33.23-11.68-70.44.41-103.5,10.92-29.75,29.91-55.43,43.21-83.98,10.8-23.12,17.43-48.06,22.94-72.93,19.68-91.49,12.52-183.18-39.49-263.15,38.31,56.71,56.66,127.22,51.62,195.71-2.69,45.72-10.9,91.5-27.5,134.35-8.82,21.06-20.9,41-31.64,61.03-23.96,42.21-27.92,85.54-13.75,129.22,14.19,25.11,25.54,51.84,33.55,79.56,2.63,9.25,4.97,18.57,6.85,28l-5.77,1.25h0Z M201.61,526.03c-6.54,12.85-15.49,24.7-25.98,34.6-5.16,5.03-10.48,9.68-15.01,14.81-22.84,26.2-26.03,64.9-21.77,98.19,0,0-5.07.88-5.07.88-1.56-7.08-2.56-14.27-3.12-21.51-1.54-21.9,1.89-44.4,11.95-64.1,6.42-13.34,17.85-23.56,28.82-32.81,8.61-7.51,16.38-15.78,22.97-25.1,1.45-2.05,3.09-4.45,4.48-6.55,0,0,2.73,1.59,2.73,1.59h0Z M155.87,796.13c2.56-13.07,1.11-25.97-1.35-39.08-3.04-11.34-7.9-25.78-13.98-37.15-6.32-12.22-14.25-23.72-19.2-36.65-8.11-20.1-11.26-41.99-13.81-63.31.68-31.13,9.87-61.16,20.04-90.16,32.29-86.8,66.6-167.23,33.3-259.92,0,0,10.35-3.62,10.35-3.62,10.03,29.2,14.89,60.28,13.64,91.15-2.09,61.45-27.57,118.95-48.28,175.6-10,27.97-18.95,56.86-19.98,86.6,1.16,8.73,2.8,24.27,5.32,34.96,2.46,11.66,5.87,22.99,10.93,33.61,4.99,10.61,11.9,20.78,17.17,32.14,5.39,11.39,9.33,23.35,12.41,35.4,2.49,13.54,3.89,28.12,1.03,41.87,0,0-7.57-1.44-7.57-1.44h0Z M102.35,587.11c-25.85-26.41-40.06-67.19-40.7-103.83,1.03-29.13,7.17-58.13,14.9-86.13,8.74-31.94,21.69-62.58,29.77-94.61,8.59-33.91,6.72-64.68-11.13-95.36,19.01,30.1,21.8,61.82,13.89,95.99-7.33,32.35-19.55,63.25-27.8,95.27-7.2,27.72-12.55,56.18-13.32,84.82.63,28.01,9.57,56.67,23.88,80.68,4.16,6.93,9.03,13.4,14.49,19.29,0,0-3.98,3.88-3.98,3.88h0Z`,
    branches: `M94.95,165.38c-11.67-23.51-11.62-58.24-9.11-84.01-1.23,21.04-.29,42.47,4.76,62.96,1.75,6.75,4.04,13.39,7.43,19.32l-3.08,1.72h0Z M254.89,288.52c26.23,60.51-1.52,125.36-42.7,171.7-13.67,15.67-28.91,29.95-45.28,42.8l-1.83-2.36c16.37-12.54,31.67-26.53,45.42-41.92,41.52-45.59,69.77-109.73,44.38-170.22h0Z M215.7,361.08c29.39,51.92,20.36,118.11-14.3,165.28,0,0-2.57-1.89-2.57-1.89,35.38-46.59,44.76-111.08,16.87-163.4h0Z M160.95,270.09c-24.32-77.33-71.29-154.24-29.65-234.87,5.21-10.4,11.43-20.24,18.24-29.61-6.44,9.63-12.24,19.68-17,30.2-38.04,81.33,11.84,155.02,38.77,230.77,0,0-10.35,3.51-10.35,3.51h0Z M98.83,622.73c-5.82-16.76-16.37-31.62-26.47-46.13-10.56-14.53-21.72-28.96-34.28-41.78C9.59,498.85,1.1,450.32,8.03,405.68c2.31-14.89,6.21-29.59,12.34-43.35-16.82,41.55-17.93,89.94-1.96,131.88,5.41,13.89,12.93,26.94,22.34,38.48,12.23,11.91,24.45,27.05,35.19,41.29,10.71,14.8,21.75,29.75,28.09,47.11,0,0-5.2,1.64-5.2,1.64h0Z M143.26,439.55c12.88-43.23-8.86-111.07-38.04-144.5-4.88-5.57-10.34-10.69-16.51-14.86,6.29,3.98,11.94,8.94,17.02,14.39,28.43,31.4,46.35,81.6,46.03,123.9-.19,7.59-1.06,15.24-3.21,22.72l-5.29-1.66h0Z M141.52,143.28c-1.4,3.01-1.52,6.32-1.55,9.57-.17,8.31,1.39,16.82-1.05,24.99-.58,1.76-1.63,3.75-3.77,3.96,0,0-.62-.79-.62-.79.19-.97.45-1.56.71-2.23,1.09-2,1.67-4.11,2-6.43.93-6.41.64-13.08,1.39-19.58.44-3.25.95-6.75,2.89-9.48h0Z M202.57,188.53c-10.14,2.71-10.85,16.98-10.79,25.65,0,0,.21,4.28.21,4.28l-1.31.07s-.04-4.34-.04-4.34c.27-8.79,1.55-23.27,11.93-25.65h0Z M210.97,268.3c-3.83,8.15-.27,17.07.74,25.49.64,4.32.93,8.76.47,13.19-.42,4.44-1.61,8.8-3.38,12.91,0,0-2.54-1.18-2.54-1.18.92-1.89,1.73-3.83,2.39-5.83,1.97-6.1,2.29-12.52,1.67-18.91-.56-8.4-3.63-17.74.65-25.66h0Z M221.18,334.18c-2.93,7.5-5.52,15.15-6.8,23.07-1.4,7.88-1.71,15.95-3.08,23.97-1.28,8.02-3.6,15.84-6.32,23.46-2.34,6.67-5.12,13.22-8.01,19.66-.46.9-.57,1.97-2.01,2.41l-.9-.43c-.61-1.4.11-2.16.48-3.1,4.67-9.95,9-20.15,12.1-30.7,3.66-11.57,4.37-23.55,6.65-35.48,1.67-7.94,4.51-15.55,7.88-22.86h0Z M59.65,386.17c7.19,7.08,15.92,30.02,13.88,40.01,0,0-3.49-.97-3.49-.97.13-.73.39-1.4.41-2.23.47-5.98-.92-11.91-2.41-17.7-1.97-6.61-4.15-13.51-8.56-18.94,0,0,.17-.18.17-.18h0Z M96.58,346.06c.8.1.56.2.59.3v.29c0,1.01.03,3.06.04,4.1.69,48.39,11.92,96.48,32.02,140.46,0,0-3.99,1.81-3.99,1.81-20.47-45.24-30.7-94.99-30.29-144.62,0,0,.01-1.18.01-1.18v-.59s0-.29,0-.29c.04-.1-.21-.2.6-.29h1Z M124.75,355.65c5.09,3.01,9.14,7.44,12.92,11.92,3.62,4.66,7.4,9.41,8.74,15.34,0,0-.99.13-.99.13-.46-2.75-1.83-5.4-3.28-7.89-3-4.99-6.67-9.6-10.77-13.73-2.07-2.05-4.25-4.03-6.75-5.51l.15-.27h0Z M94.67,293.6c-.69.52-.5,1.08-.55,1.62l-.05,1.64c-.48,16.41.62,32.86,3.09,49.09,0,0-2.18.21-2.18.21-.86-16.96-1.54-33.96-.87-50.94-.02-.55.21-1.09-.44-1.66l1,.04h0Z M132.33,300.98c-.78,6.89,6.58,26.5-4.89,26.57,0,0,.17-2.56.17-2.56,7.96,1.23,3.48-19.06,4.73-24h0Z M157.28,569.08c.25-14.77,8.88-38.84,18.65-49.85,0,0,.12.11.12.11-2.7,3.51-4.69,7.47-6.42,11.5-3.38,8.08-5.7,16.64-7.14,25.26-.67,4.27-1.13,8.68-.8,12.7l-4.42.29h0Z M205.08,517.59c13.31.49,25.73-3.34,32.86-15.32,6.96-11.22,7.49-25.05,11.58-37.38-3.6,12.71-3.48,26.4-10.12,38.23-5.48,10.25-15.45,15.88-26.78,17.32-2.34.29-5.23.48-7.59.52,0,0,.04-3.37.04-3.37h0Z M46,624.66c-17.98-6.1-32.52-21.27-37.73-39.5,5.65,17.93,20.28,32.52,38.19,38.1,0,0-.46,1.4-.46,1.4h0Z`,
    roots: `M187.03,875.42c-10.91-.09-21.89-3.22-30.86-9.53-7.32-5.27-13.33-12.63-15.93-21.37-1.32-3.84-1.57-8.21-.55-12.17,2.05-7.77,5.25-14.86,6.72-22.71,0,0,2.65.6,2.65.6-1.68,7.73-5.18,15.13-7.39,22.59-2.17,7.54.99,15.37,4.99,21.76,8.86,13.2,24.74,20.33,40.36,20.83h0Z M55.48,867.79c25.09,4.18,54.78-11.16,65.91-33.97,3.82-7.78,5.39-16.49,5.12-25.08,0,0,3.33-.07,3.33-.07.39,18.3-9.08,35.98-23.94,46.4-14.36,10.16-32.9,16.28-50.43,12.72h0Z M1.32,833.76c14.18,2.68,29.58,5.08,43.43-.23,5.11-1.89,10.15-4.44,15.42-6.31,2.76-.96,6.21-1.87,9.08-2.52,1.26-.2,4.34-.75,5.58-.93,1.24-.12,4.35-.42,5.62-.54,11.5-.83,23.87-4.25,32.15-12.61,0,0,3.64,3.42,3.64,3.42-1.97,1.97-4.12,3.5-6.35,4.85-8.81,5.25-19.1,7.53-29.27,7.77-2.13.14-5.16.19-7.23.51-4.06.41-8.51,1.35-12.41,2.5-9.84,3.21-19.68,8.3-30.35,8.13-9.73.27-19.85-1.83-29.31-4.04h0Z M266.65,846.28c-6.11-1.81-12.49-2.28-18.82-2.4-12.74-.19-25.42,1.11-38.19.38-6.4-.38-12.86-1.27-19.06-3.4-12.43-4.12-24.25-14.97-24.79-28.8-.34-6.65,1.3-13.03,2.41-19.4,1.13-6.17,1.8-12.29,1.64-18.41l5.82-.03c-.07,6.6-1.06,13.16-2.47,19.43-1.96,9.21-4.97,18-1.31,26.78,6.41,14.67,22.9,20.45,37.93,21.65,12.61,1.21,25.38.4,38.05,1.07,6.35.36,12.76,1.08,18.79,3.12h0Z M191.28,852.1c-14.58-3.79-35.85-10.12-40.22-26.61-1.85-6.81,1.41-13.91,2.96-20.26.78-3.02,1.39-6.04,1.83-9.1l7.57,1.44c-.77,3.28-1.73,6.52-2.84,9.67-1.83,5.77-5.36,11.25-4.44,17.21,1.56,9.18,10.06,14.97,17.74,19.23,5.59,3.02,11.59,5.37,17.67,7.46l-.28.96h0Z M35.84,861.14c19.73-35.82,50.31-17.05,74.35-31.65,7.7-4.89,12.39-13.08,15.69-21.42,0,0,4.65,1.9,4.65,1.9-6.31,14.52-16.05,25.08-32.27,27.56-9.46,1.63-18.97.91-28.4,1.92-15.28,1.32-26.21,8.53-34.01,21.69h0Z M304.42,836.13c-18.87,8.11-34.41,1.53-51.54-6.91-5.38-2.53-10.81-4.92-16.45-6.55-2.35-.36-6.44-.2-9.41.54-20.99,5.56-42.93.51-54-19.51-1.53-2.89-2.75-5.94-3.6-9.09-.09-.2.01-.46,1-.92l.97-.24c1.1-.06,1.32.08,1.33.29.74,2.92,1.83,5.74,3.21,8.42,5.92,11.61,18.18,19.09,31.05,20.26,4.87.51,9.82.08,14.63-.74,3.32-.55,6.64-1.43,10.07-1.54,1.81-.06,3.63.05,5.39.37,5.79,1.83,11.25,4.4,16.59,7.07,17.01,8.8,31.47,15.75,50.74,8.56h0Z M97.41,908.74c5.74-32.36,27.55-21.14,37.23-49.91,2.26-6.73,3.56-13.77,4.39-20.85l1.96.25c-1,7.15-2.48,14.27-4.95,21.1-10.6,29.19-32.17,17.23-38.63,49.41h0Z M148.21,856.52c9.42.8,18.67-4.47,23.7,6.9-5.4-11.11-14.37-5.39-23.77-5.9,0,0,.07-1,.07-1h0Z M.05,855.99c-.71-5.94,5.87-8.82,10.79-9.51.68-.12,1.25-.2,1.77-.56,3.27-2.29,4.48-6.78,8.19-8.62.68-.29,1.49-.38,2.24-.2l-.25.97c-3.47-.67-6,4.97-8.3,7.03-.71.72-1.55,1.45-2.57,1.71-5.13.55-12.37,2.83-11.86,9.18H.05Z M240.88,834.59c-7.48-.73-7.29-12.31-15.43-11.27,0,0-.08-1-.08-1,1.78-.08,3.69.31,5.13,1.44,4.01,3.19,4.61,9.94,10.38,10.83h0Z M270.85,841.07c-4.4-5.74-12.98-1.15-14.19-10.74,0,0,.99-.11.99-.11.49,8.79,9.43,5.07,13.2,10.84h0Z M118.27,880.76c2.63,2.61,4.33,5.9,5.76,9.25,1.31,3.33,2.58,6.86,2.44,10.48-.02-3.6-1.45-7.04-2.9-10.28-1.52-3.17-3.36-6.35-5.98-8.72,0,0,.68-.74.68-.74h0Z M109.18,886.97c-6.45-1.9-19.66,3.88-23.89,8.92,4.16-5.32,17.42-11.67,24.19-9.88,0,0-.29.96-.29.96h0Z M191.2,851.63c2.75,7.95,8.04,3.6,6.22,15.52,0,0,.15-2.22.15-2.22.03-2.11,0-4.59-1.45-6.23-.94-1.06-2.36-1.68-3.44-2.82-1.11-1.1-1.87-2.5-2.42-3.93l.95-.32h0Z M190.77,850.74c18.9,3.88,22.9-5.44,39.19,11.45-16.38-16.62-20.3-7.38-39.3-10.97,0,0,.1-.49.1-.49h0Z M87.35,838.34c-6.21,11.63-22.24,9.76-27.77,20.36,3.99-8.35,14.5-9.34,21.29-14.48,2.33-1.68,4.28-3.83,5.6-6.35l.88.47h0Z M224.97,843.57c11,10.88,21.66,2.43,35.67,14.47-2.61-2-5.4-3.78-8.46-4.98-9.93-3.89-19.38-.28-27.91-8.77,0,0,.7-.72.7-.72h0Z`,
    grailPaths: [
      "M156.33,904.27c-23.97-3.03-64.37,5.42-82.38-12.84,0,0-.36-.38-.36-.38-.05-1.03.12-2.18.66-2.93,1.04-1.73,2.89-2.89,4.52-3.86,4.17-2.34,8.58-3.8,12.56-6.34,5.87-3.67,10.7-8.63,14.91-14.14,2.83-3.67,5.42-7.58,8.04-11.49.87-.97,1.62-2.37,2.23-3.63,6.43-14.15,11.54-31.53,16.6-46.35,1.89-5.7,3.72-11.4,5.76-17.12,14.75-41.66,54.37-63.48,85.11-91.92,9.67-9.13,18.67-19.24,25.19-30.89,0,0,2.16-3.89,2.16-3.89,0,0,1.9-4.03,1.9-4.03l.95-2.02c1.12-2.75,1.48-3.82,2.44-6.24,2.44-7.02,4.12-14.39,5.19-21.75.43-2.96.52-5.96,1.04-8.93.15.72.03,1.5,0,2.25-.38,9.77-1.94,19.55-4.73,28.92-16.12,53.03-65.86,69.92-98.1,109.27-7.36,9.23-13.46,19.46-17.52,30.55-3.97,11.21-7.57,22.73-11.51,34.07-3.87,10.66-7.22,21.61-12.57,31.67-6.47,9.32-14.44,21.65-25.54,28.18-4.01,2.52-8.65,4.04-12.73,6.26-.97.55-1.9,1.15-2.66,1.82-.77.67-1.22,1.42-1.2,1.91,0,0-.36-.85-.36-.85,4.57,4.89,11.05,7.74,17.71,9.39,13.57,3.24,27.78,2.84,41.7,3.08,7.03.13,14.09.28,21.1,1.24l-.13.99h0Z",
      "M120.14,618.07c23,2.74,129.25-4.74,139.65-24.3,0,0,.02,1.65.02,1.65-2.07-4.06-6.5-6.7-10.57-8.78-40.76-19.52-167.91-19.46-209.54-1.41-4.5,2.13-9.23,4.66-11.69,9.2,1.78-4.71,6.82-7.86,11.17-10.27,4.57-2.4,9.42-4.2,14.32-5.75,19.65-5.96,40.2-8.41,60.62-9.91,30.69-2.03,61.53-1.37,92.06,2.72,10.17,1.42,20.32,3.25,30.27,6.18,7.48,2.28,15.12,4.97,21.46,9.84,2.38,1.83,4.58,4.33,5.87,7.33-1.45,3.65-4.47,6.06-7.64,7.96-8.2,4.66-17.41,6.93-26.45,8.98-24.02,5.03-48.49,6.94-72.95,7.74-12.19.2-24.5.67-36.59-1.17h0Z",
      "M24.08,615.52c1.73,29,22.2,65.28,42.18,85.97,3.25,3.3,6.77,6.35,10.62,8.98l-.31.55c-4.29-2.04-8.19-4.84-11.83-7.9-20.19-17.69-36.56-46.86-40.67-73.43-.64-4.7-.91-9.49-.4-14.19,0,0,.4.01.4.01h0Z",
      "M103.16,728.66c15.93,7.31,28.51,29.94,30.78,46.87.37,2.73.37,5.54-.01,8.24-.84-5.4-2.63-10.4-4.66-15.31-4.17-9.74-9.39-19.05-15.64-27.6-3.17-4.24-6.57-8.29-10.72-11.77l.26-.43h0Z",
      "M151.66,804.21c1.04,16.07,13.8,48.37,24.13,60.76-1.59-1.22-3.25-2.81-4.6-4.32-2.26-2.65-4.37-5.56-6.15-8.55-5.79-9.6-10.12-20.18-12.56-31.12-1.19-5.47-1.92-11.21-1.07-16.78,0,0,.25.02.25.02h0Z",
      "M165.02,765.47c-10.97,31.04.09,68.2,20.17,93.14,6.96,8.41,15.39,15.71,25.17,20.35,1.06.25,4.49,2.84,5.97,4.33,2.04,2.08,4.76,4.52,4.36,7.78-.34.38-.89.99-1.35,1.12-1.73.62-3.31-.79-4.63-1.6-2.49-1.7-5.32-3.65-8.04-4.79-3.69-1.63-7.82-2.3-12.06-2.91-8.52-1.14-17.15-2.18-25.69-3.07-17.2-1.99-34.41-.43-51.59,1.27,0,0-.02-.11-.02-.11,8.46-1.6,17.19-3.02,25.72-3.95,13-1.41,26.15-.61,39.12.7,8.8,1.09,17.6,1,26.08,4.41,3.72,1.47,7.32,4.32,10.51,6.15-.29-.06-.6-.02-.89.09-.16.06-.49.24-.66.45l-.54,1.16s-.04.09-.01.13c.03.05-.03-.06-.03-.08-1.56-2.88-4.55-5.35-7.3-7.13-31.04-14.99-48.87-51.25-50.44-84.6-.38-11.23,1.13-22.72,5.74-33.02,0,0,.41.17.41.17h0Z",
      "M147.71,720.45c-49.13.85-102.28-46.96-107.11-95.89,0,0,3.83-.29,3.83-.29,3.64,47.94,55.11,95.9,103.28,96.18h0Z"
    ],
    grailLiquid: "M42,619 Q150,800 248,619 Q150,650 42,619 Z"
  };
  
  export default TREE_DATA;
const FLOWER_COORDS = [
  {id:'f1', x:149.44, y:5.32}, {id:'f2', x:85.84, y:81.38}, {id:'f3', x:154.23, y:144.28},
  {id:'f4', x:141.52, y:137.96}, {id:'f5', x:207.53, y:186.73}, {id:'f6', x:93.02, y:205.84},
  {id:'f7', x:213.54, y:263.35}, {id:'f8', x:84.86, y:276.98}, {id:'f9', x:251.32, y:287.86},
  {id:'f10', x:96.07, y:290.78}, {id:'f11', x:134.85, y:296.11}, {id:'f12', x:224.02, y:332.8},
  {id:'f13', x:214.68, y:358.68}, {id:'f14', x:124.67, y:355.78}, {id:'f15', x:20.36, y:362.33},
  {id:'f16', x:55.61, y:386.93}, {id:'f17', x:251.32, y:458.76}, {id:'f18', x:178.44, y:514.74},
  {id:'f19', x:20.22, y:532.45}, {id:'f20', x:6.46, y:581.34}
];

export const RitualTree = ({ userId, wallet, score }: { userId: string, wallet: number, score: number }) => {
  const firestore = useFirestore();
  
  // ÉTATS DE LA LOGIQUE CURSEUR => GRAAL => ARBRE
  const [sliderValue, setSliderValue] = useState(0); // Prana dans le Graal (via curseur)
  const [visualScore, setVisualScore] = useState(score); // Prana affiché dans l'Arbre
  const [isPouring, setIsPouring] = useState(false);
  const [vibratingId, setVibratingId] = useState<string | null>(null);
  const [vibratingIds, setVibratingIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [cascadingIndex, setCascadingIndex] = useState(-1); // Pour l'éclosion une par une
  const [particles, setParticles] = useState<{id: number, x: number, delay: number, color: string}[]>([]); // Pour la pluie finale

  useEffect(() => {
    // Si la base de données dit que le score est 0 (Reclaim cliqué)
    if (score === 0) {
      setVisualScore(0);
      setSliderValue(0);
    } 
    // Sinon, on synchronise seulement si on ne verse pas
    else if (!isPouring) {
      setVisualScore(score);
    }
  }, [score, isPouring]);
  
  // Animation du vent (Breeze)
  useEffect(() => {
  const interval = setInterval(() => {
    // Si on verse, on peut mettre le vent en pause (optionnel)
    if (isPouring || visualScore >= 1000) return;

    // 1. Choix du bourgeon
    const buds = FLOWER_COORDS.map(f => f.id);
    const randomId = buds[Math.floor(Math.random() * buds.length)];

    // 2. On LANCE l'animation (on ajoute l'ID au Set)
    setVibratingIds(prev => new Set(prev).add(randomId));

    // 3. On attend EXACTEMENT la fin de TA durée d'anim (1.8s) pour le retirer
    // Sans rien casser d'autre.
    setTimeout(() => {
      setVibratingIds(prev => {
        const next = new Set(prev);
        next.delete(randomId); // Il s'arrête en douceur
        return next;
      });
    }, 1800); 

  }, 800); // Une nouvelle fleur commence à bouger toutes les 0.8s (-> chevauchement)
  
  return () => clearInterval(interval);
}, [isPouring, visualScore]);

useEffect(() => {
    if (visualScore >= 1000 && cascadingIndex === -1) {
      // 1. ÉCLOSION EN CASCADE (500ms entre chaque fleur)
      FLOWER_COORDS.forEach((_, i) => {
        setTimeout(() => {
          setCascadingIndex(i);
        }, i * 500); 
      });
  
      // 2. CRÉATION DE LA PLUIE DOUCE (40 particules) - Logique Centrée
      const treeCenterX = 152; 
      const spreadWidth = 40; 

      const newParticles = Array.from({ length: 100 }).map((_, i) => ({ 
        id: i,
        x: (treeCenterX - spreadWidth/2) + (Math.random() * spreadWidth),
        delay: Math.random() * 5,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFB7C5' 
      }));
      setParticles(newParticles);
    } else if (visualScore < 1000) {
      // Reset indispensable pour pouvoir relancer le spectacle au prochain cycle
      setCascadingIndex(-1);
      setParticles([]);
    }
  }, [visualScore, cascadingIndex]); // <--- Regarde bien : on a DEUX accolades ici.
    
    // FONCTION DE RITUEL (TON SCRIPT ADAPTÉ)
  const handleRitual = async () => {
    if (isPouring || sliderValue <= 0 || visualScore >= 1000) return;
    setIsPouring(true);

    const amountToTransfer = Math.min(sliderValue, 1000 - visualScore);
    const targetScore = visualScore + amountToTransfer;

    // 1. PHASE DE BASCULE (1.5s)
    // Gérée par le state isPouring et le CSS transition

    // 2. PHASE DE VERSEMENT
    setTimeout(() => {
      // L'arbre commence à se remplir (transition 3s dans le CSS)
      setVisualScore(targetScore);
      // Le curseur/graal se vide
      setSliderValue(0);
    }, 1500);

    // 3. FIN DU RITUEL (Retour au repos après 5.8s)
    setTimeout(() => {
      setIsPouring(false);
    }, 5800);

    // Sync Firebase réelle
    try {
      const userRef = doc(firestore, "users", userId);
      await updateDoc(userRef, {
        prana_wallet: increment(-amountToTransfer),
        tree_score: targetScore
      });
    } catch (e) { console.error(e); }
  };

  // Calcul du Y du masque de l'arbre
  const maskY = 917.24 - (Math.min(visualScore, 1000) / 1000 * 917.24);

  return (
<div className="relative w-fit mx-auto flex flex-col items-center bg-black/40 rounded-3xl p-4 border border-white/5 shadow-2xl overflow-hidden">
      
      {/* TON CSS D'UNE SEMAINE DE TRAVAIL */}
      <style>{`
        /* 1. TES ANIMATIONS BRUTES */
        @keyframes vibrate {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-6deg); }
          75% { transform: rotate(6deg); }
        }
        @keyframes breeze {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(3deg); }
        }

        .vibrating { 
          animation: vibrate 1.8s ease-in-out; 
          transform-origin: center; 
          transform-box: fill-box; 
        }

        /* 2. TES RÉGLAGES DE SURVOL */
        .bud-group { cursor: pointer; }
        .bud-group:hover .bud-shape { 
          scale: 5 !important; 
        }

        .bud-shape { 
          transition: scale 0.8s ease, opacity 0.4s ease; 
          transform-origin: center; 
          transform-box: fill-box; 
        }

        .flower-lotus { 
          transition: scale 1.8s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease; 
          transform-origin: center; 
          transform-box: fill-box; 
        }

        .bloom { opacity: 1 !important; scale: 3 !important; }

        .flower-lotus.bloom:hover {
          scale: 3.3 !important;
          transition: scale 0.8s ease;
        }
        
    @keyframes particleFall {
  0% { 
    /* On démarre à +60px pour décaler le flux vers la droite */
    transform: translateY(-50px) translateX(80px) rotate(0deg); 
    opacity: 0; 
  }
  10% { 
    opacity: 1; 
  }
  90% {
    /* Elles atteignent le sol (900px) en restant dans l'axe (étroit) */
    transform: translateY(750px) translateX(125px) rotate(900deg);
    opacity: 1;
  }
  100% { 
    /* Elles restent au sol un court instant et disparaissent (effet fonte) */
    transform: translateY(900px) translateX(125px) rotate (950deg);
    opacity: 0; 
  }
}

.particle {
  /* On garde ton "linear infinite" mais sur 5s pour laisser l'effet de fonte au sol */
  animation: particleFall 15s linear infinite;
}
      `}</style>

     {/* 2. LE CADRE DE L'ARBRE (Version Majestic 80% de l'écran) */}
      <div className="relative w-full max-w-[250px] h-[80vh] min-h-[500px]">
       <svg 
       viewBox="0 0 304.42 967.24" 
       /* 'meet' permet à l'arbre de rester entier dans les 80vh sans être écrasé */
       preserveAspectRatio="xMidYMid meet" 
       className="w-full h-full overflow-visible"
  >
    <defs>
            <linearGradient id="goldLiquidGrad" x1="0" y1="0" x2="0" y2="917" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#C6A355" />
            </linearGradient>

            <clipPath id="grail-liquid-clip">
              {/* Le rideau de vidage qui s'incline et glisse */}
              <rect 
                x={isPouring ? -400 : 0} y="550" width="400" height="400" 
                style={{ 
                    transition: 'x 3s ease-in, transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isPouring ? 'rotate(80deg)' : 'rotate(0deg)',
                    transformOrigin: 'center'
                }} 
              />
            </clipPath>

            <clipPath id="cascade-clip">
              <rect 
               x="0" 
                /* 1. Y à 760 quand on verse (point de sortie du verre)
                  2. Y descend à 1010 quand on arrête (le jet tombe vers le bas) */
               y={isPouring ? 760 : 1010} 
               width="500" 
               /* La hauteur passe de 0 à 250 quand on verse */
                height={isPouring ? 250 : 0} 
                style={{ 
               transition: isPouring 
                 /* DEBUT : On attend 0.6s (le délai) que le verre penche avant de couler */
                 ? 'height 0.8s ease-in 0.6s, y 0s' 
                 /* FIN : Le jet se détache du haut et tombe (y et height s'animent ensemble) */
                 : 'height 0.6s ease-out 0s, y 0.6s ease-out 0s' 
               }} 
             />
            </clipPath>
            
            <mask id="prana-mask">
              <rect x="-100" y={maskY} width="500" height="920" fill="white" style={{ transition: 'y 3s ease-out' }} />
            </mask>
          </defs>

          <g fill="#5D544B" transform="translate(0, 40)">
             <path id="trunk-full" d={TREE_DATA.trunk} />
             <path id="branches-full" d={TREE_DATA.branches} />
             <path id="roots-full" d={TREE_DATA.roots} />

             {/* LA CASCADE */}
             <path d="M250,760 Q200,820 260,850 Q210,865 160,850 Q190,780 250,760 Z"
                fill="url(#goldLiquidGrad)" clipPath="url(#cascade-clip)"
                style={{ filter: 'drop-shadow(0 0 12px #FFD700)', opacity: isPouring ? 1 : 0 }} />

             {/* LE GRAAL (TES COORDONNÉES ET DOUBLES SCALES) */}
             <g onClick={handleRitual}
                style={{ 
                    cursor: 'pointer',
                    transition: 'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    transformOrigin: 'center center',
                    transform: isPouring 
                        ? 'translate(0px, 430px) scale(0.6) rotate(-100deg)' 
                        : 'translate(30px, 180px) scale(0.6) rotate(0deg)'
                }}>
                <g fill="none" stroke="#AFEEEE" strokeWidth="2" transform="translate(280, 250) scale(0.6)">
                  <rect x="0" y="580" width="300" height="350" fill="white" opacity="0" />
                  {TREE_DATA.grailPaths.map((p, i) => (<path key={i} d={p} />))}
                  
                  {/* LIQUIDE DU GRAAL (NIVEAU PILOTÉ PAR SLIDER) */}
                  <path 
                    d={TREE_DATA.grailLiquid} 
                    fill="url(#goldLiquidGrad)" 
                    clipPath="url(#grail-liquid-clip)" 
                    style={{ opacity: sliderValue > 0 || isPouring ? 1 : 0, transition: 'opacity 1s' }} 
                  />
                </g>
             </g>
          </g>

          {/* CALQUE D'OR (REMPLISSAGE ARBRE) */}
          <g mask="url(#prana-mask)" fill="url(#goldLiquidGrad)" transform="translate(0, 40)">
            <use href="#trunk-full" />
            <use href="#branches-full" />
            <use href="#roots-full" />
          </g>

{/* LES FLEURS (STRUCTURE CASCADE + VENT SUR LOTUS) */}
<g transform="translate(0, 50)">
{FLOWER_COORDS.map((f, i) => {
  const isBlooming = (visualScore >= 1000 && i <= cascadingIndex) || previewId === f.id;
  const isVibrating = vibratingIds.has(f.id);

  return (
    <g 
      key={f.id} 
      transform={`translate(${f.x}, ${f.y})`} 
      className="bud-group"
      /* MAGIE : On déclenche la brise quand on passe dessus (Souris ou Doigt) */
      onPointerOver={() => {
        if (!vibratingIds.has(f.id)) {
          setVibratingIds(prev => new Set(prev).add(f.id));
          // On retire l'effet après la durée de l'anim (1.8s)
          setTimeout(() => {
            setVibratingIds(prev => {
              const next = new Set(prev);
              next.delete(f.id);
              return next;
            });
          }, 1800);
        }
      }}
    >
      {/* GROUPE DE VIBRATION : Il entoure tout, donc le Lotus vibrera aussi ! */}
      <g className={isVibrating ? "vibrating" : ""}>
        
        {/* BOURGEON (Goutte) */}
        <path 
          d="M0,-6 C3,-2 3,3 0,6 C-3,3 -3,-2 0,-6 Z" 
          fill="#FFB7C5"
          className="bud-shape"
          onClick={() => {
            if (visualScore < 1000) {
              setPreviewId(f.id);
              setTimeout(() => setPreviewId(null), 1200);
            }
          }}
          style={{ 
            scale: isBlooming ? 0 : 4, 
            opacity: isBlooming ? 0 : 1 
          }} 
        />
        
        {/* LOTUS PICASSO (Éclos) */}
        <g 
          className={`flower-lotus ${isBlooming ? 'bloom' : ''} ${isVibrating ? 'vibrating' : ''}`} 

          style={{ 
            scale: isBlooming ? 3 : 0, 
            opacity: isBlooming ? 1 : 0 
          }}
        >
            <circle r="2" fill="#FFD700" style={{ filter: 'blur(1px)' }} />
            <path d="M0,0 Q-5,-12 0,-18 Q5,-12 0,0" fill="#FFB7C5" transform="rotate(-35)" />
            <path d="M0,0 Q-5,-12 0,-18 Q5,-12 0,0" fill="#FFB7C5" transform="rotate(35)" />
            <path d="M0,0 Q-5,-12 0,-18 Q5,-12 0,0" fill="#FFB7C5" />
            <path d="M0,0 Q-3,-8 0,-12 Q3,-8 0,0" fill="#FFB7C5" opacity="0.7" transform="scale(0.8) rotate(180)" />
        </g>
      </g>
    </g>
  );
})}
</g>

{/* LA PLUIE DOUCE (Apparaît seulement quand l'arbre est plein) */}
<g opacity={visualScore >= 1000 ? 1 : 0} style={{ transition: 'opacity 2s' }}>
  {particles.map((p) => (
    <circle
      key={p.id}
      cx={p.x}
      cy="-20"
      r={Math.random() * 3 + 1}
      fill={p.color}
      className="particle"
      style={{ animationDelay: `${p.delay}s` }}
    />
  ))}

</g>
        </svg>
      </div>

      {/* MODULE DE TEST : CURSEUR => GRAAL => ARBRE */}
      <div className="mt-4 w-full bg-white/5 p-4 rounded-xl border border-white/10 text-center">
        <div className="text-amber-400 text-[10px] uppercase tracking-widest mb-2 font-bold">
           Remplir le Graal : {sliderValue} units
        </div>
        <input 
            type="range" min="0" max="1000" value={sliderValue} 
            onChange={(e) => setSliderValue(parseInt(e.target.value))} 
            className="w-full h-1 bg-amber-900 rounded-lg appearance-none cursor-pointer accent-amber-400" 
        />
        <button 
            onClick={handleRitual}
            className="mt-4 px-6 py-2 bg-amber-500/20 text-amber-400 text-[10px] uppercase tracking-widest rounded-full border border-amber-500/40 hover:bg-amber-500/40 transition-all"
        >
            {isPouring ? "Rituel en cours..." : "Verser dans l'Arbre"}
        </button>
      </div>

      <div className="mt-4 text-white/30 text-[10px] uppercase tracking-tighter">
         Score de l'Arbre : {visualScore} / 1000
      </div>
    </div>
  );
};