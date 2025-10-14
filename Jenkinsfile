pipeline {
    agent none // Each stage will define its own agent

    stages {
        stage('Checkout') {
            agent any
            steps {
                cleanWs()
                checkout scm
            }
        }

        stage('Build Application') {
            // Use a Node.js Docker container for the entire build process
            agent {
                docker { image 'node:18-alpine' }
            }
            steps {
                echo 'Installing dependencies and building the application...'
                // These commands run at the project root, which is correct for your setup
                sh 'PUPPETEER_SKIP_DOWNLOAD=true npm install --cache .npm-cache'
                sh 'npm run build'
            }
        }

        stage('Build Docker Image') {
            // This stage runs on the main Jenkins agent, which has Docker access.
            // It uses the workspace from the previous stage.
            agent any
            steps {
                script {
                    echo "Building Docker image..."
                    // This command now works because 'npm run build' has created the 'dist' folder
                    // and your Dockerfile is at the root of the workspace.
                    def dockerImage = docker.build("adhithyananand/invoicebuddy:${env.BUILD_NUMBER}", ".")
                }
            }
        }

        stage('Push Docker Image (Optional)') {
            agent any
            when { expression { return env.DOCKER_HUB_CREDENTIALS_ID } }
            steps {
                withCredentials([usernamePassword(credentialsId: env.DOCKER_HUB_CREDENTIALS_ID, usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    script {
                        def imageName = "adhithyananand/invoicebuddy:${env.BUILD_NUMBER}"
                        echo "Logging into Docker Hub and pushing image: ${imageName}"
                        sh 'echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin'
                        sh "docker push ${imageName}"
                    }
                }
            }
        }

        stage('Deploy') {
            agent any
            steps {
                script {
                    def imageName = "adhithyananand/invoicebuddy:${env.BUILD_NUMBER}"
                    echo "Deploying ${imageName}..."
                    
                    // Stop and remove the old container if it exists, then run the new one
                    sh """
                        docker stop invoicebuddy-container || true
                        docker rm invoicebuddy-container || true
                        docker run -d --name invoicebuddy-container -p 5000:5000 --restart unless-stopped ${imageName}
                    """
                }
            }
        }
    }

    post {
        always {
            script {
                node() {
                    echo 'Cleaning up the workspace.'
                    cleanWs()
                }
            }
        }
    }
}