import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Users, DollarSign, Download, Shield } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">IP</span>
            </div>
            <span className="text-xl font-semibold text-slate-900">Invoice Buddy</span>
          </div>
          <Link href="/login">
            <Button className="bg-primary hover:bg-primary/90">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Your Invoice Management Buddy
          </h1>
          <h1 className="text-4xl font-bold text-blue-500 mb-6">
          Easy, Fast, Free, and Secure
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            The complete billing solution for small businesses and professionals. 
            Create invoices, manage customers, and track payments with ease.
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
            Everything you need to manage your billing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Professional Invoices</CardTitle>
                <CardDescription>
                  Create beautiful, branded invoices with itemized line items, taxes, and payment terms.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Customer Management</CardTitle>
                <CardDescription>
                  Organize your customer database with detailed contact information and billing history.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>Payment Tracking</CardTitle>
                <CardDescription>
                  Monitor payment status, track outstanding amounts, and get insights into your cash flow.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Download className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle>PDF Generation</CardTitle>
                <CardDescription>
                  Download professional PDFs with your company branding for invoices and quotations.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle>Company Branding</CardTitle>
                <CardDescription>
                  Set up your company profile with logo, contact details, and branding for all documents.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-slate-600" />
                </div>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Your data is completely isolated and secure. Each user gets their own private workspace.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to streamline your billing?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Experience the ease of managing your invoices with Invoice Buddy.
          </p>
          <Link href="/register">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto text-center text-slate-600">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <span className="text-white font-bold text-xs">IP</span>
            </div>
            <span className="font-semibold">Invoice Buddy</span>
          </div>
          <p className="text-sm">
            © 2025 Invoice Buddy. Professional billing made simple.
          </p><p className="text-sm">
            Created with ❤️ by <a href="https://github.com/Adhithyan-Anand" className="text-primary hover:underline">Adhithyan Anand</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
