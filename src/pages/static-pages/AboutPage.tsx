import React from 'react';
import Navbar from '../../components/static/Navbar';
import '../../styles/AboutPage.css';
// @ts-ignore
import ntnuCampus from '../../assets/ntnu-campus.png';
import { useLanguage } from '../../contexts/LanguageContext';


const NtnuLogo = () => (
    <svg
        version="1.1"
        id="ntnulogo"
        width="171.2mm"
        height="31.57mm"
        viewBox="0 0 485.29302 89.487796"
        xmlns="http://www.w3.org/2000/svg"
        style={{
            maxWidth: '100%',
            height: 'auto',
            fill: 'var(--primary)'  // Use your primary color variable instead of white
        }}
    >
        <g transform="matrix(2,0,0,2,0,-6.806602)">
            <path
                d="M 33.081001,17.082001 H 11.024 v 22.062 h 22.057001 z m 0,33.084999 H 11.024 C 4.935,50.167 0,45.23 0,39.144001 v -22.062 C 0,10.998 4.935,6.062 11.024,6.062 h 22.057001 c 6.087998,0 11.022,4.936 11.022,11.020001 v 22.062 c 0,6.085999 -4.934002,11.022999 -11.022,11.022999 z"
                transform="matrix(1,0,0,-1,0,53.570301)"
            />
            <path
                d="m 0,0 c -4.997,0 -9.046,-4.054 -9.046,-9.049 0,-4.998 4.049,-9.045999 9.046,-9.045999 4.996,0 9.046,4.047999 9.046,9.045999 C 9.046,-4.054 4.996,0 0,0 Z"
                transform="matrix(1,0,0,-1,21.978201,16.333)"
            />
            <path
                d="M 0,0 21.479,-31.225 V -7.2 l -0.062,5.714 H 14.962 V 0 H 28.805 V -1.486 H 23.466 L 23.404,-7.2 V -44.386002 L 22.411,-44.696999 -6.394,-2.792 v -33.649002 l 0.061,-5.896 H -9.25 V -43.827 h -14.337 v 1.489998 h 5.71 l 0.061,5.896 V -7.2 l -0.061,5.714 h -5.71 V 0 Z"
                transform="matrix(1,0,0,-1,74.955803,3.4502)"
            />
            <path
                d="m 0,0 v -14.027 h -1.863 c -0.187,2.172 -0.436,4.901 -2.36,8.131 -2.234,3.786 -5.277,3.974 -8.256,4.098 h -3.478 l -0.06,-5.588 v -28.616998 l 0.06,-6.334004 H -9.25 V -43.827 h -20.361 v 1.489998 h 6.702 l 0.064,6.334004 V -7.386 l -0.064,5.588 h -2.855999 c -3.600001,-0.062 -6.330002,-0.062 -8.938,-4.221 -2.048,-3.292 -2.235001,-5.899 -2.360001,-8.008 h -1.799 V 0 Z"
                transform="matrix(1,0,0,-1,146.5964,3.4502)"
            />
            <path
                d="M 0,0 21.479,-31.225 V -7.2 l -0.061,5.714 H 14.961 V 0 H 28.804001 V -1.486 H 23.465 L 23.402,-7.2 V -44.386002 L 22.409,-44.696999 -6.396,-2.792 v -33.649002 l 0.063,-5.896 H 0.312 V -43.827 h -14.343 v 1.489998 h 5.714 l 0.058,5.896 V -7.2 l -0.058,5.714 h -5.714 V 0 Z"
                transform="matrix(1,0,0,-1,164.2263,3.4502)"
            />
            <path
                d="m 0,0 v -1.486 h -6.148 l -0.059,-5.28 V -30.48 c 0.059,-6.145999 0.186,-11.979999 11.732,-11.979999 11.67,0 12.415001,5.09 12.6,10.615 V -6.766 l -0.06,5.28 H 11.797 V 0 H 25.511999 V -1.486 H 20.115 l -0.062,-5.28 v -22.598 c -0.065,-8.131998 -0.126,-15.082999 -16.204,-15.082999 -2.294,0 -7.761,0.246998 -11.235,1.675999 -5.525,2.359001 -5.649,7.200001 -5.712,13.160999 V -6.766 l -0.063,5.28 H -18.5 V 0 Z"
                transform="matrix(1,0,0,-1,217.13451,3.4502)"
            />
        </g>
    </svg>
);

const AboutPage= () => {
    const { t } = useLanguage();
    return (
        <div className="about-page">
            <Navbar  />

            <div className="about-hero">
                <div className="about-hero-content">
                    <h1>{t('about', 'aboutTitle')}</h1>
                    <p>
                        {t('about', 'aboutDescription')}
                    </p>
                </div>
            </div>

            <div className="about-container">
                <section className="our-story-section">
                    <h2>{t('about', 'ourStory')}</h2>
                    <div className="story-content">
                        <div className="story-image">
                            <img src={ntnuCampus} alt="NTNU Campus" />
                        </div>
                        <div className="story-text">
                            <p>
                                {t('about', 'ourStoryText1')}
                            </p>
                            <p>
                                {t('about', 'ourStoryText2')}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="team-section">
                    <h2>{t('about', 'meetOurTeam')}</h2>
                    <div className="team-grid">
                        <div className="team-member">
                            <h3>Yasin Hessnawi</h3>
                            <p className="member-title">{t('about', 'computerScienceEngineer')}</p>
                        </div>
                        <div className="team-member">
                            <h3>Anwar Debs</h3>
                            <p className="member-title">{t('about', 'computerScienceEngineer')}</p>
                        </div>
                        <div className="team-member">
                            <h3>Rami Amer</h3>
                            <p className="member-title">{t('about', 'computerScienceEngineer')}</p>
                        </div>
                    </div>
                </section>

                <section className="mission-section">
                    <h2>{t('about', 'ourMission')}</h2>
                    <div className="mission-content">
                        <div className="mission-values">
                            <div className="value-item">
                                <div className="value-icon">🔒</div>
                                <h3>{t('about', 'privacyFirst')}</h3>
                                <p>
                                    {t('about', 'privacyFirstText')}
                                </p>
                            </div>
                            <div className="value-item">
                                <div className="value-icon">🤖</div>
                                <h3>{t('about', 'advancedTechnology')}</h3>
                                <p>
                                    {t('about', 'advancedTechnologyText')}
                                </p>
                            </div>
                            <div className="value-item">
                                <div className="value-icon">🌐</div>
                                <h3>{t('about', 'efficientArchiving')}</h3>
                                <p>
                                    {t('about', 'efficientArchivingText')}
                                </p>
                            </div>
                            <div className="value-item">
                                <div className="value-icon">⚖️</div>
                                <h3>{t('about', 'ethicalResponsibility')}</h3>
                                <p>
                                    {t('about', 'ethicalResponsibilityText')}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="education-section">
                    <h2>{t('about', 'academicFoundation')}</h2>
                    <div className="education-content">
                        <div className="education-image">
                            <NtnuLogo />
                        </div>
                        <div className="education-text">
                            <h3>{t('about', 'ntnuTitle')}</h3>
                            <p>
                                {t('about', 'ntnuText1')}
                            </p>
                            <p>
                                {t('about', 'ntnuText2')}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="future-section">
                    <h2>{t('about', 'lookingForward')}</h2>
                    <p>
                        {t('about', 'lookingForwardText')}
                    </p>
                </section>
            </div>
        </div>
    );
};

export default AboutPage;
