import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase'; 
import { collection, addDoc, serverTimestamp, doc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { Plus, X, Edit, Trash2, FileText, DollarSign, Building, ChevronLeft, ChevronRight, Calendar, Mail, FileSpreadsheet, Copy } from 'lucide-react';
import { Card, Button, Input, Textarea } from '../data/constants.jsx';
import { CompanySearchSelector, DuplicateCompanyCleaner } from '../components/CompanySearchSelector.jsx';
import { ExportButton } from '../utils/ExcelExport.jsx';

const STAGE_ORDER = [
    'Lead',
    'Qualifying',
    'Site Visit / Demo',
    'Proposal Sent',
    'Negotiation',
    'Closed-Won',
    'Closed-Lost'
];

// ==========================================
// HTML EMAIL TEMPLATES WITH WORKING IMAGE URLS
// ==========================================
const HTML_EMAIL_TEMPLATES = {
    initial_contact: {
        name: 'Initial Contact - Professional Introduction',
        subject: 'Clean Energy Solution for {{company}}',
        getHtml: (data) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c61 100%); padding: 30px 40px; text-align: center;">
                            <img src="https://i.postimg.cc/XYgJQbfL/karnot-logo.png" alt="Karnot Energy Solutions" style="height: 50px; margin-bottom: 10px;" />
                            <div style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
                                Low Carbon Heat Pumps
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #2c3e50; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">
                                Clean Energy Solution for ${data.company}
                            </h2>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear ${data.contact},
                            </p>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                Thank you for your interest in Karnot Energy Solutions' natural refrigerant heat pump systems.
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <img src="https://i.postimg.cc/mrLFhg3h/heat-pump-18kw.png" alt="Karnot Heat Pump" style="max-width: 100%; height: auto; border-radius: 8px;" />
                            </div>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We specialize in PFAS-free, environmentally-friendly heating and cooling solutions using CO₂ and R290 technology for commercial and industrial applications.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-left: 4px solid #ff6b35; border-radius: 4px; margin: 25px 0;">
                                <tr>
                                    <td style="padding: 20px 25px;">
                                        <div style="color: #2c3e50; font-weight: 700; font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
                                            Our Systems Offer:
                                        </div>
                                        <div style="color: #34495e; font-size: 15px; line-height: 1.8;">
                                            ✓ 48% cost advantage over traditional systems<br/>
                                            ✓ Proven technology with international certifications<br/>
                                            ✓ BOI-SIPP registered supplier<br/>
                                            ✓ Full installation and maintenance support
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 25px 0 30px 0;">
                                I'd like to schedule a brief call to discuss how our technology can benefit ${data.company}.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c61 100%); border-radius: 6px; padding: 14px 32px;">
                                        <a href="mailto:stuart.cox@karnot.com?subject=Meeting Request - ${data.company}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: block;">
                                            Schedule a Call
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
                                Are you available for a 15-minute call this week?
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px 40px; border-top: 2px solid #f0f0f0;">
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                                <tr>
                                    <td>
                                        <div style="color: #2c3e50; font-size: 16px; font-weight: 700; margin-bottom: 8px;">
                                            Kind Regards,
                                        </div>
                                        <div style="color: #2c3e50; font-size: 18px; font-weight: 700; margin-bottom: 4px;">
                                            Stuart Cox
                                        </div>
                                        <div style="color: #7f8c8d; font-size: 14px; margin-bottom: 15px;">
                                            CEO, Karnot Energy Solutions Inc.
                                        </div>
                                        <div style="color: #34495e; font-size: 14px; line-height: 1.8;">
                                            📧 <a href="mailto:stuart.cox@karnot.com" style="color: #ff6b35; text-decoration: none;">stuart.cox@karnot.com</a><br/>
                                            📱 <a href="tel:+639602892001" style="color: #34495e; text-decoration: none;">+63 960 289 2001</a><br/>
                                            🌐 <a href="https://karnot.com" style="color: #ff6b35; text-decoration: none;">www.karnot.com</a>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #2c3e50; padding: 25px 40px; text-align: center;">
                            <div style="color: #ecf0f1; font-size: 12px; line-height: 1.6; margin-bottom: 10px;">
                                <strong>Low Carbon Technology Centre</strong><br/>
                                Cosmos Farm, Cosmos Street, Nilmobot Manpandan<br/>
                                Pangasinan, Philippines 2429
                            </div>
                            <div style="color: #95a5a6; font-size: 11px; line-height: 1.5; margin-top: 15px; padding-top: 15px; border-top: 1px solid #34495e;">
                                Confidentiality: This email and attachments are confidential and intended solely for the named addressee(s).
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
    },

    follow_up: {
        name: 'Follow-Up After Demo',
        subject: 'Following Up: {{company}} Heat Pump Project',
        getHtml: (data) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c61 100%); padding: 30px 40px; text-align: center;">
                            <img src="https://i.postimg.cc/XYgJQbfL/karnot-logo.png" alt="Karnot" style="height: 50px; margin-bottom: 10px;" />
                            <div style="color: #ffffff; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">
                                Low Carbon Heat Pumps
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #2c3e50; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">
                                ${data.project} - Next Steps
                            </h2>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear ${data.contact},
                            </p>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                Thank you for taking the time to meet with us regarding the <strong>${data.project}</strong> project.
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <img src="https://i.postimg.cc/YSRqwSF1/heat-pump-9kw.png" alt="Karnot R290 Heat Pump" style="max-width: 100%; height: auto; border-radius: 8px;" />
                            </div>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 8px; margin: 30px 0;">
                                <tr>
                                    <td style="padding: 30px;">
                                        <div style="color: #2c3e50; font-weight: 700; font-size: 16px; margin-bottom: 20px; text-align: center;">
                                            Our R290 Heat Pump System Can Deliver:
                                        </div>
                                        <table width="100%" cellpadding="10" cellspacing="0">
                                            <tr>
                                                <td style="color: #34495e; font-size: 15px; padding: 8px 0;">
                                                    💰 <strong>Estimated Annual Savings:</strong>
                                                </td>
                                                <td align="right" style="color: #27ae60; font-size: 18px; font-weight: 700; padding: 8px 0;">
                                                    ${data.savings}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="color: #34495e; font-size: 15px; padding: 8px 0;">
                                                    ⏱️ <strong>Payback Period:</strong>
                                                </td>
                                                <td align="right" style="color: #3498db; font-size: 18px; font-weight: 700; padding: 8px 0;">
                                                    ${data.payback} months
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding-top: 15px; border-top: 2px solid #dee2e6; color: #34495e; font-size: 14px; line-height: 1.8;">
                                                    ✓ Reduced carbon footprint<br/>
                                                    ✓ Compliance with latest environmental regulations
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 25px 0;">
                                I've attached our formal proposal for your review.
                            </p>
                            <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #ff6b35 0%, #ff8c61 100%); border-radius: 6px; padding: 14px 32px;">
                                        <a href="mailto:stuart.cox@karnot.com?subject=Follow-up - ${data.company}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: block;">
                                            Schedule Follow-Up Call
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 25px 0 0 0;">
                                Looking forward to working with ${data.company}.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px 40px; border-top: 2px solid #f0f0f0;">
                            <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                                <tr>
                                    <td>
                                        <div style="color: #2c3e50; font-size: 16px; font-weight: 700; margin-bottom: 8px;">Kind Regards,</div>
                                        <div style="color: #2c3e50; font-size: 18px; font-weight: 700; margin-bottom: 4px;">Stuart Cox</div>
                                        <div style="color: #7f8c8d; font-size: 14px; margin-bottom: 15px;">CEO, Karnot Energy Solutions Inc.</div>
                                        <div style="color: #34495e; font-size: 14px; line-height: 1.8;">
                                            📧 stuart.cox@karnot.com<br/>📱 +63 960 289 2001
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #2c3e50; padding: 25px; text-align: center; color: #ecf0f1; font-size: 11px;">
                            Confidentiality: This email and attachments are confidential.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
    },

    proposal_sent: {
        name: 'Proposal Sent - Professional Quote',
        subject: 'Proposal: {{project}} - Karnot Energy Solutions',
        getHtml: (data) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); padding: 30px 40px; text-align: center;">
                            <img src="https://i.postimg.cc/XYgJQbfL/karnot-logo.png" alt="Karnot" style="height: 50px; margin-bottom: 10px;" />
                            <div style="color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 15px;">
                                Formal Proposal
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="color: #2c3e50; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">
                                ${data.project}
                            </h2>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear ${data.contact},
                            </p>
                            <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                                Please find attached our detailed proposal for the <strong>${data.project}</strong> at ${data.company}.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fff5f0 0%, #ffe8dd 100%); border: 2px solid #ff6b35; border-radius: 8px; margin: 30px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <div style="color: #ff6b35; font-weight: 700; font-size: 16px; margin-bottom: 20px; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
                                            📋 Proposal Summary
                                        </div>
                                        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                                            <tr style="border-bottom: 1px solid #ffd4c0;">
                                                <td style="color: #2c3e50; font-size: 15px; padding: 12px 0;">Total Investment:</td>
                                                <td align="right" style="color: #ff6b35; font-size: 20px; font-weight: 700; padding: 12px 0;">${data.value}</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid #ffd4c0;">
                                                <td style="color: #2c3e50; font-size: 15px; padding: 12px 0;">Estimated ROI:</td>
                                                <td align="right" style="color: #27ae60; font-size: 20px; font-weight: 700; padding: 12px 0;">${data.roi}%</td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid #ffd4c0;">
                                                <td style="color: #2c3e50; font-size: 15px; padding: 12px 0;">Implementation Timeline:</td>
                                                <td align="right" style="color: #3498db; font-size: 18px; font-weight: 700; padding: 12px 0;">${data.timeline} weeks</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #2c3e50; font-size: 15px; padding: 12px 0;">Warranty:</td>
                                                <td align="right" style="color: #9b59b6; font-size: 16px; font-weight: 700; padding: 12px 0;">5 Years Comprehensive</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color: #e8f5e9; border-left: 4px solid #27ae60; padding: 20px; border-radius: 4px; margin: 25px 0;">
                                <div style="color: #27ae60; font-weight: 700; font-size: 15px; margin-bottom: 12px;">📌 Next Steps:</div>
                                <div style="color: #2c3e50; font-size: 14px; line-height: 1.8;">
                                    1. Review the proposal<br/>
                                    2. Schedule a technical Q&A session<br/>
                                    3. Site survey (if needed)<br/>
                                    4. Final approval and contract signing
                                </div>
                            </div>
                            <table cellpadding="0" cellspacing="0" style="margin: 30px auto;">
                                <tr>
                                    <td align="center" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); border-radius: 6px; padding: 14px 32px;">
                                        <a href="mailto:stuart.cox@karnot.com?subject=Proposal - ${data.company}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: block;">
                                            Discuss This Proposal
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #2c3e50; padding: 25px; text-align: center; color: #ecf0f1; font-size: 12px;">
                            Stuart Cox, CEO | stuart.cox@karnot.com | +63 960 289 2001
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
    },

    negotiation: {
        name: 'Negotiation Phase',
        subject: 'Re: {{project}} - Addressing Your Questions',
        getHtml: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr><td style="background: linear-gradient(135deg, #3498db 0%, #5dade2 100%); padding: 30px 40px; text-align: center;">
                    <img src="https://i.postimg.cc/XYgJQbfL/karnot-logo.png" alt="Karnot" style="height: 50px;" />
                </td></tr>
                <tr><td style="padding: 40px;">
                    <h2 style="color: #2c3e50; font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">Re: ${data.project}</h2>
                    <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear ${data.contact},</p>
                    <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                        Thank you for your questions regarding the <strong>${data.project}</strong> proposal.
                    </p>
                    <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 25px 0;">
                        We value our partnership with ${data.company} and want to ensure this project meets all your requirements.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin: 30px auto;">
                        <tr><td align="center" style="background: linear-gradient(135deg, #3498db 0%, #5dade2 100%); border-radius: 6px; padding: 14px 32px;">
                            <a href="mailto:stuart.cox@karnot.com?subject=Questions - ${data.company}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: block;">Let's Discuss</a>
                        </td></tr>
                    </table>
                </td></tr>
                <tr><td style="padding: 20px 40px; background-color: #f8f9fa;">
                    <div style="color: #2c3e50; font-weight: 700;">Stuart Cox, CEO</div>
                    <div style="color: #7f8c8d; font-size: 14px;">stuart.cox@karnot.com | +63 960 289 2001</div>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`
    },

    won: {
        name: 'Project Won - Welcome!',
        subject: 'Welcome to Karnot Energy Solutions!',
        getHtml: (data) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr><td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <tr><td style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 40px; text-align: center;">
                    <img src="https://i.postimg.cc/XYgJQbfL/karnot-logo.png" alt="Karnot" style="height: 50px; margin-bottom: 15px;" />
                    <div style="color: #ffffff; font-size: 28px; font-weight: 700; margin-top: 20px;">🎉 Welcome to Karnot!</div>
                    <div style="color: #d5f4e6; font-size: 14px; margin-top: 10px;">We're thrilled to partner with ${data.company}</div>
                </td></tr>
                <tr><td style="padding: 40px;">
                    <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Dear ${data.contact},</p>
                    <p style="color: #34495e; font-size: 18px; line-height: 1.6; margin: 0 0 25px 0; font-weight: 600;">
                        Congratulations! We're thrilled to begin working with ${data.company} on the <span style="color: #27ae60;">${data.project}</span>.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <img src="https://i.postimg.cc/mrLFhg3h/heat-pump-18kw.png" alt="Heat Pump System" style="max-width: 100%; height: auto; border-radius: 8px;" />
                    </div>
                    <table cellpadding="0" cellspacing="0" style="margin: 30px auto;">
                        <tr><td align="center" style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); border-radius: 6px; padding: 14px 32px;">
                            <a href="mailto:stuart.cox@karnot.com?subject=Project Kickoff - ${data.company}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: block;">Contact Your Team</a>
                        </td></tr>
                    </table>
                </td></tr>
                <tr><td style="background-color: #27ae60; padding: 25px; text-align: center; color: #ffffff; font-size: 12px;">
                    Stuart Cox, CEO | stuart.cox@karnot.com | +63 960 289 2001
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`
    }
};

// ==========================================
// EMAIL TEMPLATE MODAL COMPONENT
// ==========================================
const EmailTemplateModal = ({ opportunity, onClose }) => {
    const [selectedTemplate, setSelectedTemplate] = useState('initial_contact');
    const [emailHtml, setEmailHtml] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (opportunity && selectedTemplate) {
            const template = HTML_EMAIL_TEMPLATES[selectedTemplate];
            const value = Number(opportunity.estimatedValue) || 0;
            const savings = Math.round(value * 0.3);
            
            const data = {
                company: opportunity.customerName || '[Company Name]',
                contact: opportunity.contactName || '[Contact Name]',
                project: opportunity.project || '[Project Name]',
                value: '$' + value.toLocaleString(),
                savings: '$' + savings.toLocaleString(),
                payback: '18-24',
                roi: '35',
                timeline: '8-12'
            };
            
            setEmailHtml(template.getHtml(data));
            setEmailSubject(template.subject
                .replace(/{{company}}/g, data.company)
                .replace(/{{project}}/g, data.project)
            );
        }
    }, [opportunity, selectedTemplate]);

    const handleCopyHtml = () => {
        navigator.clipboard.writeText(emailHtml);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenInEmail = () => {
        const mailtoLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent('Please view in HTML mode')}`;
        window.open(mailtoLink);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800">Email Templates</h2>
                        <p className="text-sm text-gray-500 mt-1">{opportunity.customerName} - {opportunity.project}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="!p-2">
                        <X size={20} />
                    </Button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Template</label>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => setSelectedTemplate(e.target.value)}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg font-semibold"
                        >
                            {Object.entries(HTML_EMAIL_TEMPLATES).map(([key, template]) => (
                                <option key={key} value={key}>{template.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Subject Line</label>
                        <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email Preview</label>
                        <div 
                            className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50 overflow-auto"
                            style={{maxHeight: '400px'}}
                            dangerouslySetInnerHTML={{__html: emailHtml}}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex gap-3">
                    <Button onClick={handleCopyHtml} variant="primary" className="flex-1">
                        <Copy size={16} className="mr-2" />
                        {copied ? 'Copied!' : 'Copy HTML Email'}
                    </Button>
                    <Button onClick={handleOpenInEmail} variant="secondary" className="flex-1">
                        <Mail size={16} className="mr-2" />
                        Open in Email Client
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// MAIN FUNNEL PAGE COMPONENT
// ==========================================
const FunnelPage = ({ opportunities, user, quotes, onOpenQuote, onOpen, companies, contacts, appointments }) => {
    const [showNewOpportunity, setShowNewOpportunity] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState(null);
    const [selectedEmailOpp, setSelectedEmailOpp] = useState(null);
    const [showDuplicateCleaner, setShowDuplicateCleaner] = useState(false);
    
    const [formData, setFormData] = useState({
        customerName: '',
        companyId: '',
        contactId: '',
        contactName: '',
        project: '',
        estimatedValue: '',
        stage: 'Lead',
        notes: '',
        probability: 10
    });

    const stageProbabilities = {
        'Lead': 10,
        'Qualifying': 20,
        'Site Visit / Demo': 40,
        'Proposal Sent': 60,
        'Negotiation': 75,
        'Closed-Won': 100,
        'Closed-Lost': 0
    };

    const stageColors = {
        'Lead': 'bg-gray-100 border-gray-300',
        'Qualifying': 'bg-blue-50 border-blue-200',
        'Site Visit / Demo': 'bg-purple-50 border-purple-200',
        'Proposal Sent': 'bg-yellow-50 border-yellow-200',
        'Negotiation': 'bg-orange-50 border-orange-200',
        'Closed-Won': 'bg-green-50 border-green-300',
        'Closed-Lost': 'bg-red-50 border-red-200'
    };

    const opportunitiesByStage = useMemo(() => {
        const grouped = {};
        STAGE_ORDER.forEach(stage => {
            grouped[stage] = opportunities
                .filter(opp => opp.stage === stage)
                .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));
        });
        return grouped;
    }, [opportunities]);

    const handleSaveOpportunity = async (e) => {
        e.preventDefault();
        if (!user) return;

        const opportunityData = {
            ...formData,
            estimatedValue: parseFloat(formData.estimatedValue) || 0,
            probability: stageProbabilities[formData.stage] || 10,
            updatedAt: serverTimestamp(),
            ...(editingOpportunity ? {} : { createdAt: serverTimestamp() })
        };

        try {
            if (editingOpportunity) {
                await setDoc(
                    doc(db, "users", user.uid, "opportunities", editingOpportunity.id),
                    opportunityData,
                    { merge: true }
                );
            } else {
                await addDoc(
                    collection(db, "users", user.uid, "opportunities"),
                    opportunityData
                );
            }
            
            setShowNewOpportunity(false);
            setEditingOpportunity(null);
            setFormData({
                customerName: '',
                companyId: '',
                contactId: '',
                contactName: '',
                project: '',
                estimatedValue: '',
                stage: 'Lead',
                notes: '',
                probability: 10
            });
        } catch (error) {
            console.error("Error saving opportunity:", error);
            alert("Error saving opportunity");
        }
    };

    const handleDeleteOpportunity = async (oppId) => {
        if (!user || !window.confirm("Delete this opportunity?")) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "opportunities", oppId));
        } catch (error) {
            console.error("Error deleting opportunity:", error);
        }
    };

    const handleMoveStage = async (oppId, direction) => {
        if (!user) return;
        const opportunity = opportunities.find(o => o.id === oppId);
        if (!opportunity) return;

        const currentIndex = STAGE_ORDER.indexOf(opportunity.stage);
        const newIndex = currentIndex + direction;
        
        if (newIndex < 0 || newIndex >= STAGE_ORDER.length) return;
        
        const newStage = STAGE_ORDER[newIndex];
        
        try {
            await setDoc(
                doc(db, "users", user.uid, "opportunities", oppId),
                {
                    stage: newStage,
                    probability: stageProbabilities[newStage] || 10,
                    updatedAt: serverTimestamp()
                },
                { merge: true }
            );
        } catch (error) {
            console.error("Error moving opportunity:", error);
        }
    };

    const OpportunityCard = ({ opp, quotesForThisOpp, companyData, upcomingAppointments }) => {
        const currentStageIndex = STAGE_ORDER.indexOf(opp.stage);
        const nextStage = STAGE_ORDER[currentStageIndex + 1];
        const previousStage = STAGE_ORDER[currentStageIndex - 1];

        const handleMoveForward = () => {
            if (nextStage) {
                handleMoveStage(opp.id, 1);
            }
        };

        const handleMoveBackward = () => {
            if (previousStage) {
                handleMoveStage(opp.id, -1);
            }
        };

        const companyQuoteCount = companyData?.quoteCount || 0;
        const companyTotalValue = companyData?.totalValue || 0;
        const companyLastQuoteDate = companyData?.lastQuoteDate || null;
        const nextAppointment = upcomingAppointments && upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

        return (
            <Card className="p-4 mb-3 rounded-lg shadow border border-gray-200 bg-white">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-800 text-base leading-tight">
                        {opp.customerName}
                    </h4>
                    <div className="flex gap-1">
                        <Button onClick={() => setSelectedEmailOpp(opp)} variant="secondary" className="p-1 h-auto w-auto" title="Email Template">
                            <Mail size={14}/>
                        </Button>
                        <Button onClick={() => {
                            setEditingOpportunity(opp);
                            setFormData(opp);
                            setShowNewOpportunity(true);
                        }} variant="secondary" className="p-1 h-auto w-auto">
                            <Edit size={14}/>
                        </Button>
                        <Button onClick={() => handleDeleteOpportunity(opp.id)} variant="danger" className="p-1 h-auto w-auto">
                            <Trash2 size={14}/>
                        </Button>
                    </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{opp.project}</p>
                
                {/* Opportunity Value & Probability */}
                <div className="mt-3 flex justify-between items-center">
                    <span className="text-lg font-bold text-orange-600">
                        ${(opp.estimatedValue || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {opp.probability || 0}%
                    </span>
                </div>
                
                {/* Quote count for THIS opportunity */}
                {quotesForThisOpp && quotesForThisOpp.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                        <DollarSign size={12} />
                        <span>{quotesForThisOpp.length} Quote{quotesForThisOpp.length > 1 ? 's' : ''}</span>
                    </div>
                )}

                {/* Next Appointment Alert */}
                {nextAppointment && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        <Calendar size={12} />
                        <span className="font-semibold">
                            {new Date(nextAppointment.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} @ {nextAppointment.appointmentTime}
                        </span>
                    </div>
                )}

                {/* Company History Data */}
                {companyData && companyQuoteCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                            <Building size={12} />
                            <span className="font-semibold">Company History</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500">Total Quotes:</span>
                            <span className="font-semibold text-gray-700">{companyQuoteCount}</span>
                        </div>
                        
                        {companyTotalValue > 0 && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Total Value:</span>
                                <span className="font-semibold text-green-600">${companyTotalValue.toLocaleString()}</span>
                            </div>
                        )}
                        
                        {companyLastQuoteDate && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Last Quote:</span>
                                <span className="font-semibold text-gray-700">
                                    {new Date(companyLastQuoteDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        )}
                    </div>
                )}
                
                <Button onClick={() => onOpen(opp)} variant="secondary" className="w-full text-xs py-1 mt-3">
                    <FileText size={14} className="mr-1"/> View Details / Notes
                </Button>

                {/* Move Backward and Forward buttons */}
                {(opp.stage !== 'Closed-Won' && opp.stage !== 'Closed-Lost') && (
                    <div className="mt-2 flex gap-2">
                        {previousStage && (
                            <Button 
                                onClick={handleMoveBackward} 
                                variant="secondary" 
                                className="flex-1 text-xs py-1 flex items-center justify-center"
                            >
                                <ChevronLeft size={14} className="mr-1" /> Back
                            </Button>
                        )}
                        {nextStage && (
                            <Button 
                                onClick={handleMoveForward} 
                                variant="secondary" 
                                className="flex-1 text-xs py-1 flex items-center justify-center"
                            >
                                Forward <ChevronRight size={14} className="ml-1" />
                            </Button>
                        )}
                    </div>
                )}
            </Card>
        );
    };

    // Calculate company data and quotes for each opportunity
    const enrichedOpportunities = useMemo(() => {
        return opportunities.map(opp => {
            const company = companies.find(c => c.id === opp.companyId);
            const quotesForThisOpp = quotes.filter(q => q.opportunityId === opp.id);
            const companyQuotes = quotes.filter(q => q.customer?.name === opp.customerName);
            const companyTotalValue = companyQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
            const lastQuoteDate = companyQuotes.length > 0
                ? Math.max(...companyQuotes.map(q => q.lastModified?.toDate?.() || 0))
                : null;
            const upcomingAppointments = appointments
                .filter(a => a.companyId === opp.companyId && new Date(a.appointmentDate) > new Date())
                .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

            return {
                ...opp,
                quotesForThisOpp,
                companyData: {
                    quoteCount: companyQuotes.length,
                    totalValue: companyTotalValue,
                    lastQuoteDate
                },
                upcomingAppointments
            };
        });
    }, [opportunities, quotes, companies, appointments]);

    const enrichedOpportunitiesByStage = useMemo(() => {
        const grouped = {};
        STAGE_ORDER.forEach(stage => {
            grouped[stage] = enrichedOpportunities
                .filter(opp => opp.stage === stage)
                .sort((a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0));
        });
        return grouped;
    }, [enrichedOpportunities]);

    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Sales Funnel</h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Pipeline Management • {opportunities.length} Active Opportunities
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => setShowDuplicateCleaner(true)} variant="secondary">
                        <Building size={16} className="mr-2" /> Clean Duplicates
                    </Button>
                    <ExportButton 
                        data={opportunities}
                        filename="sales_funnel_export.csv"
                        label="Export"
                        icon={FileSpreadsheet}
                    />
                    <Button onClick={() => setShowNewOpportunity(true)} variant="primary">
                        <Plus size={16} className="mr-2" /> New Opportunity
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
                {STAGE_ORDER.map(stage => (
                    <div key={stage} className="min-h-[500px] min-w-[580px]">
                        <div className={`p-4 rounded-t-lg font-black text-base uppercase tracking-wide ${stageColors[stage]}`}>
                            {stage}
                            <div className="text-sm font-bold mt-1">({enrichedOpportunitiesByStage[stage]?.length || 0})</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-b-lg min-h-[450px]">
                            {(enrichedOpportunitiesByStage[stage] || []).map(opp => (
                                <OpportunityCard 
                                    key={opp.id} 
                                    opp={opp}
                                    quotesForThisOpp={opp.quotesForThisOpp}
                                    companyData={opp.companyData}
                                    upcomingAppointments={opp.upcomingAppointments}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {showNewOpportunity && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-black text-gray-800">
                                {editingOpportunity ? 'Edit Opportunity' : 'New Opportunity'}
                            </h2>
                            <Button onClick={() => {
                                setShowNewOpportunity(false);
                                setEditingOpportunity(null);
                            }} variant="secondary" className="!p-2">
                                <X size={20} />
                            </Button>
                        </div>
                        <form onSubmit={handleSaveOpportunity} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Company</label>
                                <CompanySearchSelector
                                    companies={companies}
                                    selectedCompanyId={formData.companyId}
                                    onSelect={(id) => {
                                        const company = companies.find(c => c.id === id);
                                        setFormData(prev => ({
                                            ...prev,
                                            companyId: id,
                                            customerName: company?.companyName || ''
                                        }));
                                    }}
                                    placeholder="Search companies..."
                                />
                            </div>
                            <Input
                                label="Project Name"
                                value={formData.project}
                                onChange={(e) => setFormData({...formData, project: e.target.value})}
                                required
                            />
                            <Input
                                label="Estimated Value ($)"
                                type="number"
                                value={formData.estimatedValue}
                                onChange={(e) => setFormData({...formData, estimatedValue: e.target.value})}
                                required
                            />
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Stage</label>
                                <select
                                    value={formData.stage}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        stage: e.target.value,
                                        probability: stageProbabilities[e.target.value]
                                    })}
                                    className="w-full p-3 border-2 border-gray-200 rounded-lg"
                                >
                                    {STAGE_ORDER.map(stage => (
                                        <option key={stage} value={stage}>{stage}</option>
                                    ))}
                                </select>
                            </div>
                            <Textarea
                                label="Notes"
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={4}
                            />
                            <div className="flex gap-3 pt-4">
                                <Button type="submit" variant="primary" className="flex-1">
                                    {editingOpportunity ? 'Update' : 'Create'} Opportunity
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setShowNewOpportunity(false);
                                        setEditingOpportunity(null);
                                    }}
                                    variant="secondary"
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedEmailOpp && (
                <EmailTemplateModal
                    opportunity={selectedEmailOpp}
                    onClose={() => setSelectedEmailOpp(null)}
                />
            )}

            {showDuplicateCleaner && (
                <DuplicateCompanyCleaner 
                    companies={companies} 
                    user={user}
                    onClose={() => setShowDuplicateCleaner(false)}
                />
            )}
        </div>
    );
};

export default FunnelPage;
