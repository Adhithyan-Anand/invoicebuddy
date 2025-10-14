pipeline {
  agent any

  environment {
    NODE_ENV = 'production'
    // Optionally load secrets from Jenkins credentials or .env
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install dependencies') {
      steps {
        sh 'npm install'
      }
    }

    stage('Build client') {
      steps {
        script {
          if (fileExists('client/package.json')) {
            sh 'cd client && npm install && npm run build'
          }
        }
      }
    }

    stage('Lint & Test') {
      steps {
        // Uncomment if you have lint or test scripts
        // sh 'npm run lint'
        // sh 'npm test'
      }
    }

    stage('Build Docker image') {
      steps {
        script {
          dockerImage = docker.build("invoicebuddy:${env.BUILD_NUMBER}")
        }
      }
    }

    stage('Push Docker image') {
      when {
        expression { env.DOCKER_REGISTRY && env.DOCKER_USERNAME && env.DOCKER_PASSWORD }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
          sh 'echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin'
          sh "docker tag invoicebuddy:${env.BUILD_NUMBER} $DOCKER_REGISTRY/invoicebuddy:${env.BUILD_NUMBER}"
          sh "docker push $DOCKER_REGISTRY/invoicebuddy:${env.BUILD_NUMBER}"
        }
      }
    }

    stage('Deploy') {
      steps {
        // Add your deployment steps here (e.g., SSH, kubectl, docker-compose, etc.)
        echo 'Deploy stage - add your deployment logic here'
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}
