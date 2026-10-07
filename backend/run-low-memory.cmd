@echo off
setlocal
cd /d "%~dp0"
rem Maven and the forked Spring Boot process need separate JVM limits.
set "MAVEN_OPTS=-Xms32m -Xmx192m -XX:ReservedCodeCacheSize=64m -XX:ActiveProcessorCount=2 -XX:+UseSerialGC"
call "%~dp0mvnw.cmd" "-Dspring-boot.run.jvmArguments=-Xms32m -Xmx256m -XX:ReservedCodeCacheSize=64m -XX:ActiveProcessorCount=2 -XX:+UseSerialGC" spring-boot:run %*
exit /b %ERRORLEVEL%
