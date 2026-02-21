require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "lanterna-react-native"
  s.version      = package["version"]
  s.summary      = "Performance profiling for React Native apps"
  s.homepage     = "https://github.com/nicepkg/lanterna"
  s.license      = "MIT"
  s.author       = "Lanterna Contributors"
  s.source       = { :git => "https://github.com/nicepkg/lanterna.git", :tag => s.version }

  s.platforms    = { :ios => "14.0" }
  s.source_files = "ios/**/*.{h,m,mm}"

  if defined?(install_modules_dependencies)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
