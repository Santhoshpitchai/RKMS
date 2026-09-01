import { BookOpen, Users, Heart, Lightbulb, Calendar, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useSiteContent } from '../services/useSiteContent';

export function Services() {
  const { content } = useSiteContent();

  const services = [
    {
      icon: BookOpen,
      key: 'service_educational',
      title: 'Educational Programs',
      description: 'We provide educational workshops, literacy programs, and skill development courses to empower women with knowledge and capabilities.',
      image: content['service_educational'] || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600',
      impact: '500+ women trained annually',
    },
    {
      icon: Lightbulb,
      key: 'service_skill',
      title: 'Skill Development',
      description: 'Vocational training programs in tailoring, handicrafts, computer skills, and entrepreneurship to enhance employability and self-reliance.',
      image: content['service_skill'] || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600',
      impact: '300+ women skilled in various trades',
    },
    {
      icon: Users,
      key: 'service_community',
      title: 'Community Support',
      description: 'Building a strong support network for women through counseling services, peer support groups, and mentorship programs.',
      image: content['service_community'] || 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600',
      impact: '1000+ active community members',
    },
    {
      icon: Heart,
      key: 'service_welfare',
      title: 'Women Welfare',
      description: 'Providing assistance to women in need through healthcare support, financial aid, and legal guidance programs.',
      image: content['service_welfare'] || 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=600',
      impact: '200+ families supported',
    },
    {
      icon: Calendar,
      key: 'service_cultural',
      title: 'Cultural Activities',
      description: 'Organizing cultural events, traditional celebrations, and heritage preservation programs to keep our rich culture alive.',
      image: content['service_cultural'] || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
      impact: '50+ cultural events yearly',
    },
    {
      icon: Award,
      key: 'service_family',
      title: 'Family Support',
      description: 'Strengthening family bonds through parenting workshops, marriage counseling, and family welfare programs.',
      image: content['service_family'] || 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600',
      impact: '150+ families counseled',
    },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#0A6C87] to-cyan-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Services</h1>
          <p className="text-xl max-w-3xl mx-auto text-cyan-50">
            Comprehensive programs designed to empower women and strengthen communities
          </p>
        </div>
      </section>

      {/* Main Services Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What We Do</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our programs are designed to create lasting impact through education, skill development, 
            and community support initiatives.
          </p>
        </div>

        <div className="grid gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow flex flex-col md:flex ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
            >
              {/* Image area — objectFit:contain so the FULL image is always visible */}
              <div
                className="md:w-1/2 flex-shrink-0 flex items-center justify-center bg-gray-50"
                style={{ minHeight: '300px', maxHeight: '360px' }}
              >
                <img
                  src={service.image}
                  alt={service.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '300px',
                    maxHeight: '360px',
                    objectFit: 'contain',
                    display: 'block',
                    padding: '12px',
                  }}
                />
              </div>
              <div className="md:w-1/2 p-8 flex flex-col justify-center">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4">
                  <service.icon className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                {/* Show admin-saved description if available, else show default */}
                <p className="text-gray-700 mb-4">
                  {content[`${service.key}_desc`] || service.description}
                </p>
                <div className="bg-cyan-50 rounded-lg p-4 inline-block">
                  <p className="text-cyan-700 font-semibold">Impact: {service.impact}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Impact Overview */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Impact</h2>
            <p className="text-xl text-gray-600">
              Making a real difference in the lives of women and families
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { number: '2000+', label: 'Lives Impacted', color: 'text-cyan-600' },
              { number: '70+', label: 'Events Organised', color: 'text-amber-600' },
              { number: '800+', label: 'Active Members', color: 'text-[#0A6C87]' },
              { number: '4 Years', label: 'Years of Service', color: 'text-cyan-600' },
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-lg p-6 text-center shadow-lg hover:shadow-xl transition-shadow">
                <div className={`text-4xl font-bold mb-2 ${stat.color}`}>
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Get Involved */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-[#0A6C87] to-cyan-600 rounded-2xl p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-6">Get Involved</h2>
          <p className="text-xl mb-8 text-cyan-50 max-w-2xl mx-auto">
            Join us in our mission to empower women and build stronger communities. 
            Your support makes a difference.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/donate"
              className="bg-white text-[#0A6C87] px-8 py-3 rounded-lg font-semibold hover:bg-cyan-50 transition-colors"
            >
              Donate Now
            </Link>
            <Link
              to="/events"
              className="bg-[#E5C100] text-[#0A6C87] px-8 py-3 rounded-lg font-semibold hover:bg-[#CCA900] transition-colors"
            >
              View Events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}