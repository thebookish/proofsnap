import Footer from "@/components/footer";
import Hero from "@/components/hero";
import Navbar from "@/components/navbar";
import {
  ArrowUpRight,
  Camera,
  FileCheck,
  Hash,
  Clock,
  Download,
  Share2,
  Search,
  Filter,
  Shield,
  Fingerprint,
  Globe,
} from "lucide-react";
import { createClient } from "../../supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <Navbar />
      <Hero />

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              Powerful Screenshot Verification
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Transform your screenshots into legally-binding evidence with our
              comprehensive verification system.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Camera className="w-6 h-6" />,
                title: "Drag & Drop Upload",
                description:
                  "Simply drag your screenshots or browse files with instant progress tracking and validation",
              },
              {
                icon: <Hash className="w-6 h-6" />,
                title: "SHA256 Verification",
                description:
                  "Every screenshot gets a unique cryptographic hash to ensure tamper-proof integrity",
              },
              {
                icon: <Clock className="w-6 h-6" />,
                title: "Secure Timestamping",
                description:
                  "Immutable timestamps with IP address and browser metadata for complete audit trails",
              },
              {
                icon: <FileCheck className="w-6 h-6" />,
                title: "PDF Proof Reports",
                description:
                  "Generate downloadable legal-grade reports with all verification details included",
              },
              {
                icon: <Share2 className="w-6 h-6" />,
                title: "Shareable Links",
                description:
                  "Create secure, one-click shareable links for easy evidence distribution",
              },
              {
                icon: <Search className="w-6 h-6" />,
                title: "Smart Search & Filter",
                description:
                  "Find screenshots instantly by date, project, custom tags, or verification status",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How ProofSnap Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Three simple steps to turn your screenshots into verifiable
              evidence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                1. Upload Screenshots
              </h3>
              <p className="text-gray-600">
                Drag and drop your screenshots or browse files. We support all
                major image formats with instant validation.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. AI Verification</h3>
              <p className="text-gray-600">
                Our system generates SHA256 hashes, timestamps, and captures
                metadata to create tamper-proof evidence.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Generate Proof</h3>
              <p className="text-gray-600">
                Download PDF reports or create shareable links with complete
                verification details for legal use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Screenshots Verified</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Legal Cases Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">99.9%</div>
              <div className="text-blue-100">Verification Accuracy</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start Creating Verifiable Proof Today
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Join professionals who trust ProofSnap for secure screenshot
            verification and evidence generation.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-8 py-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium shadow-lg"
          >
            <Camera className="mr-2 w-5 h-5" />
            Launch ProofSnap Dashboard
            <ArrowUpRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
