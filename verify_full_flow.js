const axios = require('axios');

async function verifyFullFlow() {
    const baseURL = 'http://localhost:3000/api';
    const timestamp = Date.now();
    const studentCreds = { email: `student_${timestamp}@test.com`, password: 'password123', name: 'Student Test' };
    const parentCreds = { email: `parent_${timestamp}@test.com`, password: 'password123', name: 'Parent Test' };

    let studentToken = '';
    let parentToken = '';
    let studentCode = '';
    let sessionId = null;

    try {
        console.log('--- 1. Registering Student ---');
        const sReg = await axios.post(`${baseURL}/auth/register`, studentCreds);
        studentToken = sReg.data.data.token;
        studentCode = sReg.data.data.student_code;
        console.log(`Student Code: ${studentCode}`);

        const sAuth = { headers: { Authorization: `Bearer ${studentToken}` } };

        console.log('--- 2. Creating Student Profile ---');
        await axios.post(`${baseURL}/profile`, {
            name: 'Student Test',
            class: '10',
            board: 'cbse',
            stream: 'science',
            learning_speed: 'medium',
            learning_style: 'visual',
            study_duration: 30,
            selected_subjects: ['maths'],
            subject_difficulties: { maths: 'medium' }
        }, sAuth);

        console.log('--- 3. Creating Student Study Plan ---');
        const planDate = new Date().toISOString().split('T')[0];
        await axios.post(`${baseURL}/study-plan`, {
            start_date: planDate,
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total_days: 7,
            subjects: ['maths'],
            days: [
                {
                    date: planDate,
                    sessions: [
                        {
                            subjectId: 'maths',
                            subjectName: 'Maths',
                            topicId: 'algebra',
                            topicName: 'Algebra',
                            duration: 60,
                            completed: false
                        }
                    ]
                }
            ]
        }, sAuth);

        console.log('--- 4. Fetching Session ID and Completing Session ---');
        const planRes = await axios.get(`${baseURL}/study-plan`, sAuth);
        sessionId = planRes.data.data.daily_plans[0].sessions[0].id;
        await axios.patch(`${baseURL}/study-plan/session/${sessionId}`, { completed: true }, sAuth);

        console.log('--- 5. Registering Parent linked to Student ---');
        const pReg = await axios.post(`${baseURL}/auth/register`, {
            ...parentCreds,
            user_type: 'parent',
            studentCode: studentCode,
            relationship: 'Father'
        });
        parentToken = pReg.data.data.token;
        const pAuth = { headers: { Authorization: `Bearer ${parentToken}` } };

        console.log('--- 6. Verifying Child Data from Parent Account ---');
        const childRes = await axios.get(`${baseURL}/parent/child-data`, pAuth);
        const data = childRes.data.data;

        if (data.student_id && data.profile && data.studyPlan) {
            console.log('SUCCESS: Parent can see student data.');
            const session = data.studyPlan.daily_plans[0].sessions[0];
            if (session.completed) {
                console.log('SUCCESS: Parent sees student completion status correctly!');
            } else {
                console.error('FAILURE: Parent sees session as NOT completed.');
            }
        } else {
            console.error('FAILURE: Missing data in parent response:', Object.keys(data));
        }

    } catch (error) {
        console.error('ERROR during full flow verification:', error.response?.data || error.message);
    }
}

verifyFullFlow();
